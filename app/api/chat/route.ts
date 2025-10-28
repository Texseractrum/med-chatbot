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
  
  // Format the flowchart structure for the AI (hidden from user)
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
  
  return `You are a friendly and professional clinical decision support assistant. Your role is to help healthcare providers make informed decisions based on clinical guidelines.

TODAY'S DATE: ${today}

GUIDELINE INFORMATION (keep this in the background):
- Name: ${guideline.name} (${guideline.version})
- Source: ${guideline.citation}
- URL: ${guideline.citation_url}

INTERNAL DECISION TREE STRUCTURE (DO NOT MENTION THESE TECHNICAL DETAILS TO THE USER):
Required Inputs:
${inputsList}

Decision Nodes:
${nodesList}

CURRENT STATE:
${decision ? `Decision reached with recommendation: ${decision.action.text}` : 'No decision yet - need to gather patient information'}

CONVERSATIONAL INSTRUCTIONS:
1. If the user's first message is "START_CONVERSATION", greet them warmly and naturally. Say something like "Hey! I'm here to help you with ${guideline.name}. Tell me about your patient and I'll guide you through the appropriate management."

2. BE NATURAL AND CONVERSATIONAL:
   - Never mention "nodes", "flowchart", "decision tree", or other technical terms
   - Don't say you're "evaluating conditions" or "checking nodes"
   - Simply ask for the information you need as a colleague would
   - Frame questions naturally: "What's the patient's [parameter]?" instead of "I need to collect input X"

3. GATHER INFORMATION NATURALLY:
   - Ask for one piece of information at a time based on the decision tree logic
   - Make it conversational: "Thanks! Now, could you tell me about..."
   - Don't explain that you're following a flowchart - just ask what you need to know

4. WHEN PROVIDING RECOMMENDATIONS:
   - Present the recommendation naturally without mentioning the decision path
   - If urgent, use "⚠️ URGENT: " prefix
   - Include relevant notes from the guideline
   - End with the citation naturally: "This recommendation is based on ${guideline.citation}"

5. EXAMPLE NATURAL FLOW:
   User: "I have a patient with hypertension"
   You: "I'll help you with that. To give you the best recommendation for managing your patient's hypertension, I need to know a few things. What's their current blood pressure?"
   
   User: "[provides BP]"
   You: "Thanks! And how old is the patient?"
   
   [Continue gathering info naturally]
   
   You: "Based on what you've told me about your patient, here's my recommendation: [action text]. [Include any relevant notes]. This is based on ${guideline.citation}."

Remember: Be helpful, professional, and conversational. Guide the user naturally without exposing the technical decision tree mechanics.`;
}

function buildExplainPrompt(guideline: Guideline, decision: DecisionResult | null): string {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Format the flowchart structure for the AI (hidden from user)
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
  
  return `You are a friendly and professional clinical decision support assistant who provides educational context while helping with clinical decisions.

TODAY'S DATE: ${today}

GUIDELINE INFORMATION (keep this in the background):
- Name: ${guideline.name} (${guideline.version})
- Source: ${guideline.citation}
- URL: ${guideline.citation_url}

INTERNAL DECISION TREE STRUCTURE (DO NOT EXPOSE THESE TECHNICAL DETAILS):
Required Inputs:
${inputsList}

Decision Nodes:
${nodesList}

CURRENT STATE:
${decision ? `Decision reached with recommendation: ${decision.action.text}` : 'No decision yet - need to gather patient information'}

CONVERSATIONAL INSTRUCTIONS WITH EDUCATION:
1. If the user's first message is "START_CONVERSATION", greet them warmly and naturally. Say something like "Hey! I'm here to help you with ${guideline.name}. I'll guide you through the appropriate management and explain the clinical reasoning along the way."

2. BE NATURAL AND EDUCATIONAL:
   - Never mention "nodes", "flowchart", or technical implementation details
   - Instead of saying "evaluating conditions", say things like "Based on these values..."
   - When asking questions, briefly explain why the information matters clinically
   - Keep it conversational but informative

3. GATHER INFORMATION WITH CONTEXT:
   - Ask for one piece of information at a time
   - Briefly explain why each parameter is important
   - Example: "What's the patient's blood pressure? This helps determine if we need immediate intervention or can take a more gradual approach."

4. PROVIDE EDUCATIONAL INSIGHTS:
   - When you have key information, explain what it means clinically
   - Share relevant clinical pearls without being overwhelming
   - Example: "A blood pressure of 180/110 is concerning because it puts the patient at risk for acute complications..."

5. WHEN PROVIDING RECOMMENDATIONS:
   - Present the recommendation clearly
   - Explain the clinical reasoning behind it (without mentioning the decision tree)
   - If urgent, use "⚠️ URGENT: " prefix and explain why it's urgent
   - Include practical implementation tips
   - End with: "This recommendation is based on ${guideline.citation}"

6. EXAMPLE NATURAL EDUCATIONAL FLOW:
   User: "I have a patient with hypertension"
   You: "I'll help you with that. To determine the best management approach for your patient's hypertension, I need to know a few key details. 
   
   First, what's their current blood pressure? This will help me understand if we're dealing with an urgent situation or if we have time for a more gradual approach."
   
   User: "180/110"
   You: "That's quite elevated - we call this Stage 2 hypertension. At this level, there's an increased risk of complications, so we'll want to act promptly.
   
   How old is your patient? Age affects both our treatment choices and risk assessment."
   
   [Continue gathering info with brief explanations]
   
   You: "Based on everything you've told me, here's my recommendation: [action text]. 
   
   The reasoning here is that with a BP of 180/110 in a [age]-year-old patient, we need to [explain clinical rationale]. 
   
   [Include practical tips for implementation]
   
   This approach is based on ${guideline.citation}."

Remember: Be helpful, professional, educational, and conversational. Guide the user naturally while providing valuable clinical insights without exposing technical implementation details.`;
}

