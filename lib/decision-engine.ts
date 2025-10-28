import { Guideline, DecisionResult, DecisionNode } from "./types";

export class DecisionEngine {
  private guideline: Guideline;
  private inputs: Record<string, any>;

  constructor(guideline: Guideline, inputs: Record<string, any>) {
    this.guideline = guideline;
    this.inputs = inputs;
  }

  evaluate(): DecisionResult {
    const path: string[] = [];
    const notes: string[] = [];
    
    // Start at root
    let currentNodeId = "root";
    let currentNode = this.findNode(currentNodeId);
    
    while (currentNode) {
      path.push(currentNode.id);
      
      // Evaluate notes if present
      if (currentNode.notes) {
        for (const note of currentNode.notes) {
          if (this.evaluateCondition(note.if)) {
            notes.push(note.text);
          }
        }
      }
      
      // Check if this node has actions
      if (currentNode.then_action || currentNode.else_action) {
        if (currentNode.if) {
          const conditionMet = this.evaluateCondition(currentNode.if);
          const action = conditionMet ? currentNode.then_action : currentNode.else_action;
          
          if (!action) {
            throw new Error(`Node ${currentNode.id} missing action for condition result`);
          }
          
          return { action, path, notes };
        } else if (currentNode.then_action) {
          return { action: currentNode.then_action, path, notes };
        }
      }
      
      // Navigate to next node
      if (currentNode.if) {
        const conditionMet = this.evaluateCondition(currentNode.if);
        const nextNodeId = conditionMet ? currentNode.then : currentNode.else;
        
        if (!nextNodeId) {
          throw new Error(`Node ${currentNode.id} missing next node reference`);
        }
        
        currentNodeId = nextNodeId;
        currentNode = this.findNode(currentNodeId);
      } else {
        throw new Error(`Node ${currentNode.id} has no condition or action`);
      }
    }
    
    throw new Error("Decision tree evaluation failed: no terminal action found");
  }

  private findNode(id: string): DecisionNode | undefined {
    return this.guideline.nodes.find(node => node.id === id);
  }

  private evaluateCondition(condition: string): boolean {
    try {
      // Create a safe evaluation context with only the input variables
      const context = { ...this.inputs };
      
      // Replace variable names with their values
      let evaluableCondition = condition;
      for (const [key, value] of Object.entries(context)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evaluableCondition = evaluableCondition.replace(regex, JSON.stringify(value));
      }
      
      // Use Function constructor for safe evaluation
      // This is safer than eval() but still requires trusted input
      const func = new Function(`return ${evaluableCondition};`);
      return func();
    } catch (error) {
      console.error(`Error evaluating condition: ${condition}`, error);
      return false;
    }
  }

  getInputSummary(): string {
    return this.guideline.inputs
      .map(input => {
        const value = this.inputs[input.id];
        if (value === undefined || value === null || value === '') return null;
        
        if (input.type === 'boolean') {
          return `${input.label}: ${value ? 'Yes' : 'No'}`;
        }
        return `${input.label}: ${value}${input.unit ? ' ' + input.unit : ''}`;
      })
      .filter(Boolean)
      .join(', ');
  }
}

