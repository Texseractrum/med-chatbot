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
  systemPrompt: process.env.PDF_PARSER_PROMPT || `You are an expert in clinical guideline reasoning and knowledge extraction.
Your task is to convert a NICE flowchart into:

1. A complete set of **IF–THEN clinical rules**, preserving all branching.
2. A **fully structured JSON decision graph** using the schema provided.

Your extraction must be **complete, lossless, and logically faithful**.

---

## **GENERAL INSTRUCTIONS**

Extract **every** clinical decision point and action.
Do **not** skip, summarise, generalise, merge, or alter thresholds.
Every numeric threshold, comparator (>, ≥, <, ≤), time interval, and qualifier must be preserved exactly as written.

If the flowchart implies a branch or condition, you must explicitly extract it.

---

## **PART 1: IF–THEN RULES (REQUIRED)**

Produce a list of concise IF–THEN rules with these properties:

* Every condition block becomes at least one IF–THEN rule.
* Every "yes" and "no" path becomes its own IF–THEN statement.
* Include all follow-up instructions, monitoring requirements, sequential steps, and review/reassessment conditions.
* Include all treatment steps (Step 1, Step 2, Step 3, Step 4) when present.
* Include metadata requirements (e.g., which factors count as "high risk" or "moderate risk") whenever shown in the flowchart.
* Do not rewrite actions — use exact meaning and thresholds.

---

## **PART 2: JSON DECISION GRAPH (REQUIRED)**

Produce valid JSON using the schema:

{
  "guideline_id": "",
  "name": "",
  "version": "",
  "citation": "",
  "citation_url": "",
  "rules": [],
  "nodes": [
    {"id": "n1", "type": "condition|action", "text": ""}
  ],
  "edges": [
    {"from": "n1", "to": "n2", "label": "yes|no|otherwise|next"}
  ]
}

---

## **JSON RULES — THESE ARE MANDATORY**

### **1. Every condition node MUST have both a yes branch AND a no branch**

Unless the flowchart truly ends that branch.
If the flowchart does not specify the "no" path, create a node:

"Continue routine care" or "No additional action"
using the wording shown on the chart.

### **2. Every edge MUST have a non-empty label**

Accepted labels:
"yes", "no", "otherwise", "next", "if applicable", "sequential"

No blank labels are allowed.

### **3. Action nodes may map to new conditions**

If the flowchart shows sequential steps (e.g., Step 1 → Step 2 → Step 3), use "next" edges.

### **4. Treatment ladders must be explicit**

If the flowchart indicates treatment escalation (e.g., hypertension Step 1 → Step 2 → Step 3 → Step 4), represent:

* Each step as an action node
* Each escalation as a "next" or "if uncontrolled" edge

### **5. Monitoring logic must be explicit**

Include:

* follow-up intervals
* review triggers
* reassessment conditions
* BP targets
* special population adjustments (frailty, age thresholds, pregnancy trimester rules)

### **6. Metadata extraction (required when visible)**

If the flowchart lists risk factors, thresholds, or categories, include them in:

"metadata": { ... }

---

## **STRICT VALIDATION RULES**

Before producing final output, internally verify:

* JSON parses successfully.
* All edges reference valid node IDs.
* No empty label fields.
* No missing "no" branches.
* All paths from the chart appear in rules AND JSON.
* No medical threshold is altered or rounded.

---

## **OUTPUT FORMAT EXACTLY**

Part 1: IF–THEN Rules
<rules here>

Part 2: JSON Decision Graph
<valid JSON here>

Do not add commentary or explanation.`,
};
