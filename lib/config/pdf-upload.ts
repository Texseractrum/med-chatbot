// PDF Upload Configuration
export const PDF_UPLOAD_CONFIG = {
  // OpenAI Assistant Configuration
  openai: {
    model: process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06',
    assistantName: process.env.ASSISTANT_NAME || 'Medical Guideline Parser',
    filePurpose: 'assistants' as const,
  },

  // Processing Messages
  messages: {
    extracting: 'Extracting text from PDF...',
    converting: 'Converting guideline to structured format...',
    success: 'Guideline processed successfully!',
    errorPrefix: 'Error processing PDF:',
    invalidFileType: 'Please upload a JSON or PDF file.',
  },

  // File Constraints
  constraints: {
    maxFileSizeMB: parseInt(process.env.MAX_PDF_SIZE_MB || '50'),
    supportedFormats: ['.pdf', '.json'],
    estimatedProcessingTime: '15-30 seconds',
    maxPages: parseInt(process.env.MAX_PDF_PAGES || '10'),
  },

  // System Prompt
  systemPrompt: process.env.PDF_PARSER_PROMPT || `You are a medical guideline parser. Analyze the clinical guideline PDF and extract a structured JSON format.

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

Extract the decision tree logic from this medical guideline PDF and convert it to the structured format.`,
};
