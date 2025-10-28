# Clinical Decision Support Chatbot

A Next.js-based medical decision support system that combines structured clinical guidelines with AI-powered explanations. This tool helps healthcare professionals make evidence-based decisions while providing educational context.

## Features

- 📋 **Guideline-based Decision Trees**: Upload JSON or PDF clinical guidelines
- 📄 **PDF Processing**: Automatically converts PDF guidelines using GPT-4 Vision API
- 🤖 **AI Assistant**: OpenAI-powered chatbot for explanations and clarifications
- 🎯 **Two Modes**:
  - **Strict Mode**: Rule-based responses following the guideline exactly
  - **Explain Mode**: AI-enhanced explanations with educational context
- 🔒 **Safety Features**:
  - Urgent action warnings
  - Clinical disclaimers
  - Citation tracking
- 📊 **Interactive Forms**: Dynamic form generation from guideline schema
- 💬 **Smooth Chat UI**: Scroll-to-bottom chat interface with loading states
- 🎨 **Modern UI**: Clean, professional interface with improved button layouts and labels

## Getting Started

### Prerequisites

- Node.js 18+ installed
- OpenAI API key

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd med-chatbot
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Using Built-in Guidelines

1. Select "Hypertension in adults" from the guideline selector
2. Fill in the patient information form
3. View the automated decision recommendation
4. Ask questions in the chat panel for clarification

### Uploading Custom Guidelines

#### Option 1: Upload JSON File

1. Click "Upload Guideline" button
2. Select a JSON file following the guideline schema (see below)
3. The guideline will be added to your selector

#### Option 2: Upload PDF File

1. Click "Upload Guideline" button
2. Select a PDF file containing a clinical guideline
3. The system will:
   - Convert each PDF page to images (up to 10 pages)
   - Use GPT-4 Vision to extract decision tree logic
   - Automatically structure it into the guideline JSON format
4. Review and use the converted guideline

**Note**: PDF processing uses OpenAI's Vision API and may take 15-30 seconds depending on the number of pages.

### Guideline JSON Schema

```json
{
  "guideline_id": "unique_id",
  "name": "Guideline Name",
  "version": "Version info",
  "citation": "Citation text",
  "citation_url": "https://source-url.com",
  "inputs": [
    {
      "id": "input_id",
      "label": "Input Label",
      "type": "number|boolean|text",
      "unit": "optional unit"
    }
  ],
  "nodes": [
    {
      "id": "node_id",
      "if": "condition expression",
      "then": "next_node_id",
      "else": "alternative_node_id",
      "then_action": {
        "level": "info|advice|start|urgent",
        "text": "Action text"
      },
      "else_action": {
        "level": "info|advice|start|urgent",
        "text": "Action text"
      },
      "notes": [
        {
          "if": "condition",
          "text": "Additional note"
        }
      ]
    }
  ]
}
```

See `public/sample-guideline.json` for a complete example.

## Architecture

### Components

- **GuidelineSelector**: Chip-based guideline picker with upload functionality
- **GuidelineForm**: Dynamic form generator from guideline inputs
- **DecisionEngine**: Pure TypeScript decision tree evaluator
- **DecisionCard**: Visual display of clinical recommendations
- **ChatPanel**: AI-powered chat interface with mode toggle
- **SafetyBanner**: Emergency warnings and disclaimers

### File Structure

```
med-chatbot/
├── app/
│   ├── api/chat/route.ts       # OpenAI API integration
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main application page
│   └── globals.css             # Global styles
├── components/
│   ├── ChatPanel.tsx
│   ├── DecisionCard.tsx
│   ├── GuidelineForm.tsx
│   ├── GuidelineSelector.tsx
│   └── SafetyBanner.tsx
├── lib/
│   ├── decision-engine.ts      # Decision tree evaluator
│   ├── types.ts                # TypeScript type definitions
│   └── guidelines/
│       └── nice-hypertension.ts # Sample guideline
└── public/
    └── sample-guideline.json   # Example guideline JSON
```

## Technology Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI gpt-5-mini
- **Chat UI**: react-scroll-to-bottom

## Safety & Disclaimers

⚠️ **Important**: This tool is intended for healthcare professionals only and should not replace clinical judgment. Always consider:

- Individual patient context
- Contraindications
- Local protocols and regulations
- Current evidence and guidelines

This is a decision support tool, not a diagnostic or treatment system.

## License

See LICENSE file for details.

## Contributing

Contributions welcome! Please ensure:

1. All decision logic is testable
2. Safety warnings are preserved
3. Citations are maintained
4. TypeScript types are properly defined

## Support

For issues, questions, or contributions, please open an issue on GitHub.
