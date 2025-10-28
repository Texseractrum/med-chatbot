import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

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

// System prompt for parsing medical guidelines
const systemPrompt = `You are a medical guideline parser. Analyze the clinical guideline PDF and extract a structured JSON format.

This guideline may contain flowcharts, decision trees, and clinical pathways. Extract the decision logic carefully.

The JSON must follow this exact schema:
{
  "guideline_id": "unique_id_based_on_guideline",
  "name": "Full guideline name",
  "version": "Version information",
  "citation": "Citation text",
  "citation_url": "https://source-url.com (use a reasonable URL if not available)",
  "inputs": [
    {
      "id": "input_id (lowercase, underscores)",
      "label": "Input Label",
      "type": "number" or "boolean" or "text",
      "unit": "unit (e.g., mmHg, years) or empty string if not applicable"
    }
  ],
  "nodes": [
    {
      "id": "node_id",
      "if": "condition expression using input ids (e.g., 'input_id >= 180')",
      "then": "next_node_id (if condition is true) or empty string if terminal",
      "else": "alternative_node_id (if condition is false) or empty string if terminal",
      "then_action": {
        "level": "info" or "advice" or "start" or "urgent",
        "text": "Action text for when condition is true"
      },
      "else_action": {
        "level": "info" or "advice" or "start" or "urgent",
        "text": "Action text for when condition is false"
      },
      "notes": [
        {
          "if": "condition",
          "text": "Additional note"
        }
      ] (use empty array [] if no notes)
    }
  ]
}

Important rules:
1. Start with a "root" node that evaluates the first decision point
2. Each node MUST have both then_action and else_action - these describe what happens for true/false conditions
3. Use empty string ("") for then/else navigation if the node provides a final action
4. Use empty string ("") for unit if not applicable
5. Conditions use JavaScript syntax with input ids as variables
6. Action levels: "info" (normal), "advice" (lifestyle/monitoring), "start" (begin treatment), "urgent" (emergency)
7. Make the decision tree logical and clinically sound
8. Extract all relevant decision points from the guideline, including flowcharts, decision trees, and clinical pathways
9. Use empty array [] for notes if there are no conditional notes

Extract the decision tree logic from this clinical guideline and convert it to the specified JSON format.

Focus on:
- Patient assessment criteria (these become inputs)
- Decision points and thresholds
- Treatment pathways
- Urgent/emergency conditions

Extract the decision tree logic from this medical guideline PDF and convert it to the structured format.`;

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
      purpose: 'user_data',
    });

    // Use the responses API with structured output parsing
    const response = await openai.responses.parse({
      model: 'gpt-4o-2024-08-06',
      input: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_file',
              file_id: uploadedFile.id,
            },
            {
              type: 'input_text',
              text: 'Please analyze this medical guideline PDF and extract the structured information.',
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(GuidelineSchema, 'medical_guideline'),
      },
    });

    // Clean up the uploaded file
    try {
      await openai.files.delete(uploadedFile.id);
    } catch (deleteError) {
      console.warn('Failed to delete file:', deleteError);
    }

    const guideline = response.output_parsed;
    
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

