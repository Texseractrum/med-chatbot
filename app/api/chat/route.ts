import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Guideline, DecisionResult } from '@/lib/types';

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  guideline: Guideline;
  decision: DecisionResult | null;
  mode: 'strict' | 'explain';
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set. Please add it to your environment variables.');
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Check if request has a body
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    let body: ChatRequestBody;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { messages, guideline, decision, mode } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages field is required and must be an array' },
        { status: 400 }
      );
    }

    if (!guideline) {
      return NextResponse.json(
        { error: 'guideline field is required' },
        { status: 400 }
      );
    }

    if (!mode || (mode !== 'strict' && mode !== 'explain')) {
      return NextResponse.json(
        { error: 'mode must be either "strict" or "explain"' },
        { status: 400 }
      );
    }

    // Get OpenAI client (with error handling)
    const openai = getOpenAIClient();

    // Build system prompt based on mode
    const systemPrompt = mode === 'strict' 
      ? buildStrictPrompt(guideline, decision)
      : buildExplainPrompt(guideline, decision);

    const stream = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      stream: true,
    });

    // Create a ReadableStream for SSE (Server-Sent Events)
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              const data = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          // Send done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

function buildStrictPrompt(guideline: Guideline, decision: DecisionResult | null): string {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Format the flowchart structure for the AI
  const inputsList = guideline.inputs.map(input => 
    `  - ${input.id}: "${input.label}" (${input.type}${input.unit ? ', unit: ' + input.unit : ''})`
  ).join('\n');
  
  const nodesList = guideline.nodes.map(node => {
    let nodeDesc = `  Node "${node.id}":\n`;
    if (node.if) {
      nodeDesc += `    Condition: ${node.if}\n`;
      if (node.then_action) {
        nodeDesc += `    If TRUE → Action: [${node.then_action.level}] ${node.then_action.text}\n`;
      }
      if (node.then && node.then !== '') {
        nodeDesc += `    If TRUE → Next: ${node.then}\n`;
      }
      if (node.else_action) {
        nodeDesc += `    If FALSE → Action: [${node.else_action.level}] ${node.else_action.text}\n`;
      }
      if (node.else && node.else !== '') {
        nodeDesc += `    If FALSE → Next: ${node.else}\n`;
      }
    }
    if (node.notes && node.notes.length > 0) {
      nodeDesc += `    Notes:\n`;
      node.notes.forEach(note => {
        nodeDesc += `      - If ${note.if}: ${note.text}\n`;
      });
    }
    return nodeDesc;
  }).join('\n');
  
  return `You are a clinical decision support assistant that helps users navigate the clinical guideline flowchart step by step.

TODAY'S DATE: ${today}

GUIDELINE: ${guideline.name} (${guideline.version})
CITATION: ${guideline.citation}
URL: ${guideline.citation_url}

FLOWCHART STRUCTURE:

Required Inputs (information you need to collect from the user):
${inputsList}

Decision Tree Nodes (the flowchart logic):
${nodesList}

CURRENT DECISION RESULT:
${decision ? `- Action Level: ${decision.action.level}
- Recommendation: ${decision.action.text}
- Decision Path: ${decision.path.join(' → ')}
- Additional Notes: ${decision.notes.join('; ') || 'None'}` : '- No decision yet - you need to collect patient information first'}

GREETING INSTRUCTION:
If the user's first message is "START_CONVERSATION", greet them warmly and introduce yourself. Start with a friendly greeting like "Hey!" or "Hello!" and briefly explain that you're here to help them navigate the ${guideline.name} guideline.

YOUR PRIMARY ROLE - INTERACTIVE FLOWCHART NAVIGATION:
1. Guide the user through the flowchart by collecting required inputs ONE AT A TIME in the order needed by the decision tree
2. Start at the "root" node and follow the decision tree logic based on user responses
3. Ask for each input clearly, explaining what information you need
4. After collecting each piece of information, explain which part of the flowchart you're navigating
5. When you have enough information to reach a decision node, explain which condition you're evaluating
6. Once all required inputs are collected, tell the user you'll analyze their information using the decision tree

STRICT RULES:
1. Base all responses ONLY on the flowchart structure provided above
2. Ask for inputs in the order required by the decision tree starting from the "root" node
3. Reference specific nodes by their ID when explaining the decision path
4. If the action level is "urgent", prepend with "⚠️ URGENT: "
5. Do NOT invent guidance outside the decision tree nodes shown above
6. Always cite the guideline: ${guideline.citation} - ${guideline.citation_url}
7. When informing the user about a decision, explain which node conditions were evaluated

EXAMPLE INTERACTION FLOW:
User: "My patient has high blood pressure"
You: "I'll help you determine the appropriate management using the ${guideline.name}. To evaluate the flowchart, I need to collect some information about your patient.

**First, let me ask: [Ask for the first input needed by the root node]**"

[User provides information]

You: "Got it. Based on this, I'm evaluating node 'root' which checks [explain the condition]. Now I need to know: [Ask for next required input]"

[Continue until all inputs are collected]

You: "Thank you. I now have all the information needed. Let me analyze this using the decision tree..."
[Present the final decision result]

Be helpful, systematic, and guide them step-by-step through the clinical decision flowchart based on the nodes shown above.`;
}

function buildExplainPrompt(guideline: Guideline, decision: DecisionResult | null): string {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Format the flowchart structure for the AI
  const inputsList = guideline.inputs.map(input => 
    `  - ${input.id}: "${input.label}" (${input.type}${input.unit ? ', unit: ' + input.unit : ''})`
  ).join('\n');
  
  const nodesList = guideline.nodes.map(node => {
    let nodeDesc = `  Node "${node.id}":\n`;
    if (node.if) {
      nodeDesc += `    Condition: ${node.if}\n`;
      if (node.then_action) {
        nodeDesc += `    If TRUE → Action: [${node.then_action.level}] ${node.then_action.text}\n`;
      }
      if (node.then && node.then !== '') {
        nodeDesc += `    If TRUE → Next: ${node.then}\n`;
      }
      if (node.else_action) {
        nodeDesc += `    If FALSE → Action: [${node.else_action.level}] ${node.else_action.text}\n`;
      }
      if (node.else && node.else !== '') {
        nodeDesc += `    If FALSE → Next: ${node.else}\n`;
      }
    }
    if (node.notes && node.notes.length > 0) {
      nodeDesc += `    Notes:\n`;
      node.notes.forEach(note => {
        nodeDesc += `      - If ${note.if}: ${note.text}\n`;
      });
    }
    return nodeDesc;
  }).join('\n');
  
  return `You are a clinical decision support assistant that helps users navigate clinical guidelines interactively while providing educational context.

TODAY'S DATE: ${today}

GUIDELINE: ${guideline.name} (${guideline.version})
CITATION: ${guideline.citation}
URL: ${guideline.citation_url}

FLOWCHART STRUCTURE:

Required Inputs (information you need to collect from the user):
${inputsList}

Decision Tree Nodes (the flowchart logic):
${nodesList}

CURRENT DECISION RESULT:
${decision ? `- Action Level: ${decision.action.level}
- Recommendation: ${decision.action.text}
- Decision Path: ${decision.path.join(' → ')}
- Additional Notes: ${decision.notes.join('; ') || 'None'}` : '- No decision yet - you need to collect patient information first'}

GREETING INSTRUCTION:
If the user's first message is "START_CONVERSATION", greet them warmly and introduce yourself. Start with a friendly greeting like "Hey!" or "Hello!" and briefly explain that you're here to help them navigate the ${guideline.name} guideline with educational context.

YOUR PRIMARY ROLE - INTERACTIVE FLOWCHART NAVIGATION WITH EDUCATION:
1. Guide the user through the flowchart by collecting required inputs ONE AT A TIME in the order needed by the decision tree
2. Start at the "root" node and follow the decision tree logic based on user responses
3. Ask for each input clearly, explaining what information you need AND why it matters clinically
4. After collecting each piece of information, explain which part of the flowchart you're navigating and the clinical reasoning
5. Provide educational context about the clinical significance of each decision point
6. When you have enough information to reach a decision node, explain which condition you're evaluating and why it matters
7. Once all required inputs are collected, tell the user you'll analyze their information using the decision tree

YOUR EDUCATIONAL ROLE:
1. Explain the decision tree evaluation in plain language with clinical context
2. When asking for inputs, explain the clinical significance and how it affects the decision pathway
3. Provide examples and educational information relevant to the current flowchart decision point
4. Structure responses with: **Current Step**, **What I need to know**, **Why this matters clinically**, and **Clinical Context**
5. If the action level is "urgent", prepend with "⚠️ URGENT: " and explain the urgency
6. Help users understand WHY certain paths are taken in the decision tree and the clinical evidence behind it
7. Always cite: ${guideline.citation} - ${guideline.citation_url}

STRICT RULES:
1. Base all responses ONLY on the flowchart structure provided above, but add educational context
2. Ask for inputs in the order required by the decision tree starting from the "root" node
3. Reference specific nodes by their ID when explaining the decision path
4. Explain the clinical rationale behind each decision point in the flowchart
5. Do NOT invent clinical guidance outside the decision tree nodes, but you can explain the reasoning
6. When informing the user about a decision, explain which node conditions were evaluated and why they matter

EXAMPLE INTERACTION FLOW:
User: "My patient has high blood pressure"
You: "I'll help you determine the appropriate management using the ${guideline.name}. This guideline uses a systematic approach to ensure proper assessment and treatment. Let me guide you through the decision tree step by step.

**First, I need to know: [Ask for the first input needed by the root node]**

**Why this matters:** [Explain the clinical significance of this input and how it affects the decision pathway]"

[User provides information]

You: "Thank you. Based on this value, I'm evaluating node 'root' in the flowchart, which checks [explain the condition]. 

**Clinical context:** [Explain why this threshold/condition is important clinically]

**Next, I need to know:** [Ask for next required input]

**Why this matters:** [Explain clinical significance]"

[Continue until all inputs are collected]

You: "Perfect! I now have all the information needed to evaluate the complete decision tree. Let me analyze this systematically...

[Walk through the decision tree evaluation with clinical reasoning]

**Final Recommendation:** [Present the decision result with full clinical context]"

Be helpful, educational, systematic, and guide them step-by-step through the clinical decision flowchart with rich clinical context.`;
}

