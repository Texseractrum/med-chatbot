import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { PDF_UPLOAD_CONFIG } from '@/lib/config/pdf-upload';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set. Please add it to your environment variables.');
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
}

// Define the Zod schema for medical guideline structure
// Note: All fields must be required for OpenAI structured outputs
const GuidelineSchema = z.object({
  guideline_id: z.string(),
  name: z.string(),
  version: z.string(),
  citation: z.string(),
  citation_url: z.string(),
  inputs: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: z.enum(['number', 'boolean', 'text']),
      unit: z.string(), // Required - use empty string if not applicable
    })
  ),
  nodes: z.array(
    z.object({
      id: z.string(),
      if: z.string(),
      then: z.string(), // Required - use empty string if terminal node
      else: z.string(), // Required - use empty string if terminal node
      then_action: z.object({
        level: z.enum(['info', 'advice', 'start', 'urgent']),
        text: z.string(),
      }),
      else_action: z.object({
        level: z.enum(['info', 'advice', 'start', 'urgent']),
        text: z.string(),
      }),
      notes: z.array(
        z.object({
          if: z.string(),
          text: z.string(),
        })
      ), // Required - use empty array if no notes
    })
  ),
});


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get OpenAI client (with error handling)
    const openai = getOpenAIClient();

    // Convert File to a format OpenAI accepts
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Upload the PDF file to OpenAI
    const uploadedFile = await openai.files.create({
      file: await toFile(buffer, file.name, { type: file.type }),
      purpose: PDF_UPLOAD_CONFIG.openai.filePurpose,
    });

    // Create an assistant with file search capability
    const assistant = await openai.beta.assistants.create({
      name: PDF_UPLOAD_CONFIG.openai.assistantName,
      instructions: PDF_UPLOAD_CONFIG.systemPrompt,
      model: PDF_UPLOAD_CONFIG.openai.model,
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_stores: [{
            file_ids: [uploadedFile.id]
          }]
        }
      },
      response_format: zodResponseFormat(GuidelineSchema, 'medical-guideline'),
    });

    // Create a thread and run
    const thread = await openai.beta.threads.create({
      messages: [{
        role: 'user',
        content: 'Please analyze this medical guideline PDF and extract the structured information.'
      }]
    });

    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
    });

    if (run.status !== 'completed') {
      throw new Error(`Run failed with status: ${run.status}`);
    }

    // Get the messages
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(m => m.role === 'assistant');
    
    // Clean up
    try {
      await openai.beta.assistants.delete(assistant.id);
      await openai.files.delete(uploadedFile.id);
    } catch (deleteError) {
      console.warn('Failed to clean up resources:', deleteError);
    }

    if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
      return NextResponse.json(
        { error: 'No response from assistant' },
        { status: 500 }
      );
    }

    const guideline = JSON.parse(assistantMessage.content[0].text.value);
    
    if (!guideline) {
      return NextResponse.json(
        { error: 'No guideline data extracted from PDF' },
        { status: 500 }
      );
    }

    return NextResponse.json({ guideline });
  } catch (error) {
    console.error('PDF parsing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse PDF' },
      { status: 500 }
    );
  }
}

// Mark as Node.js runtime (not Edge)
export const runtime = 'nodejs';

