export interface GuidelineInput {
  id: string;
  label: string;
  type: "number" | "boolean" | "text";
  unit?: string;
}

export interface ActionOutput {
  level: "info" | "advice" | "start" | "urgent";
  text: string;
}

export interface ConditionalNote {
  if: string;
  text: string;
}

export interface DecisionNode {
  id: string;
  if?: string;
  then?: string;
  else?: string;
  then_action?: ActionOutput;
  else_action?: ActionOutput;
  notes?: ConditionalNote[];
}

export interface Guideline {
  guideline_id: string;
  name: string;
  version: string;
  citation: string;
  citation_url: string;
  inputs: GuidelineInput[];
  nodes: DecisionNode[];
}

export interface DecisionResult {
  action: ActionOutput;
  path: string[];
  notes: string[];
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  decision?: DecisionResult;
}

