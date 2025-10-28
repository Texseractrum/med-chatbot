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

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { messages, guideline, decision, mode } = body;

    // Get OpenAI client (with error handling)
    const openai = getOpenAIClient();

    // Build system prompt based on mode
    const systemPrompt = mode === 'strict' 
      ? buildStrictPrompt(guideline, decision)
      : buildExplainPrompt(guideline, decision);

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: mode === 'strict' ? 0.3 : 0.7,
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
  
  return `You are a clinical decision support assistant that helps users navigate the clinical guideline flowchart step by step.

TODAY'S DATE: ${today}

GUIDELINE: ${guideline.name} (${guideline.version})
CITATION: ${guideline.citation}

CURRENT DECISION RESULT:
- Action Level: ${decision?.action?.level || 'N/A'}
- Recommendation: ${decision?.action?.text || 'N/A'}
- Decision Path: ${decision?.path?.join(' → ') || 'N/A'}
- Additional Notes: ${decision?.notes?.join('; ') || 'None'}

GREETING INSTRUCTION:
If the user's first message is "START_CONVERSATION", greet them warmly and introduce yourself. Start with a friendly greeting like "Hey!" or "Hello!" and briefly explain that you're here to help them navigate the ${guideline.name} guideline.

YOUR PRIMARY ROLE - INTERACTIVE FLOWCHART NAVIGATION:
1. When a decision is available, explain it clearly and ask if they need clarification
2. If the user asks a new clinical question, guide them through the flowchart by asking for the required patient information ONE AT A TIME
3. Follow the decision tree structure and ask for inputs in the logical order that the flowchart requires
4. After each input is provided, explain which branch of the flowchart you're following
5. Be conversational but systematic - guide them through each decision point

STRICT RULES:
1. Base all responses ONLY on the decision tree nodes and guideline data provided
2. When patient information is missing, ask for the SPECIFIC next input needed according to the flowchart logic
3. Structure responses with: **Current Step**, **What I need to know**, and **Why** (reference to flowchart nodes)
4. If the action level is "urgent", prepend with "⚠️ URGENT: "
5. Do NOT invent guidance outside the decision tree
6. Always cite the guideline: ${guideline.citation} - ${guideline.citation_url}
7. When all inputs are collected, present the final recommendation with clear rationale

EXAMPLE INTERACTION:
User: "My patient has high blood pressure"
You: "I'll help you determine the appropriate management. First, let me ask: **What is the patient's blood pressure reading?** (This is the starting point in our flowchart)"

Be helpful, guide them step-by-step through the clinical decision flowchart.`;
}

function buildExplainPrompt(guideline: Guideline, decision: DecisionResult | null): string {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `You are a clinical decision support assistant that helps users navigate clinical guidelines interactively while providing educational context.

TODAY'S DATE: ${today}

GUIDELINE: ${guideline.name} (${guideline.version})
CITATION: ${guideline.citation}

CURRENT DECISION RESULT:
- Action Level: ${decision?.action?.level || 'N/A'}
- Recommendation: ${decision?.action?.text || 'N/A'}
- Decision Path: ${decision?.path?.join(' → ') || 'N/A'}
- Additional Notes: ${decision?.notes?.join('; ') || 'None'}

GREETING INSTRUCTION:
If the user's first message is "START_CONVERSATION", greet them warmly and introduce yourself. Start with a friendly greeting like "Hey!" or "Hello!" and briefly explain that you're here to help them navigate the ${guideline.name} guideline with educational context.

YOUR PRIMARY ROLE - INTERACTIVE FLOWCHART NAVIGATION WITH EDUCATION:
1. When a decision is available, explain it with clinical context and educational information
2. If the user asks a new clinical question, guide them through the flowchart by asking for required patient information ONE AT A TIME
3. Follow the decision tree structure and ask for inputs in the logical order
4. After each input, explain the clinical reasoning and which flowchart branch you're following
5. Provide educational context about why certain criteria matter
6. Be conversational, educational, and systematic

YOUR ROLE:
1. Explain the decision tree evaluation in plain language with clinical context
2. When patient information is missing, ask for the SPECIFIC next input needed and explain why it matters clinically
3. Provide examples and educational information relevant to the current flowchart decision point
4. Structure responses with: **Current Step**, **What I need to know**, **Why this matters**, and **Clinical Context**
5. If the action level is "urgent", prepend with "⚠️ URGENT: "
6. Help users understand WHY certain paths are taken in the decision tree
7. Always cite: ${guideline.citation} - ${guideline.citation_url}

EXAMPLE INTERACTION:
User: "My patient has high blood pressure"
You: "I'll help you determine the best management approach. **First, let me ask: What is the patient's blood pressure reading?** 

This is the starting point in our hypertension management flowchart. The specific BP value will determine whether we need urgent treatment, can start routine management, or need further assessment. Blood pressure thresholds are critical decision points in the guideline."

Be helpful, educational, guide them step-by-step, and provide clinical context at each decision point.`;
}

