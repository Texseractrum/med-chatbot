# Quick Start Guide

## Setup (First Time)

1. **Install dependencies** (if not already done):

   ```bash
   npm install
   ```

2. **Set up your OpenAI API key**:

   The key is already in `.env.local` according to your message. If you need to update it:

   ```bash
   # Create or edit .env.local
   echo "OPENAI_API_KEY=your-key-here" > .env.local
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

4. **Open your browser** to [http://localhost:3000](http://localhost:3000)

## Using the Application

### With the Built-in NICE Hypertension Guideline

1. **Select the guideline**: Click on "Hypertension in adults: diagnosis and management"

2. **Fill in patient data**:

   - Clinic Systolic BP (e.g., 145)
   - Clinic Diastolic BP (e.g., 92)
   - Age (e.g., 65)
   - Target-organ damage: Yes/No
   - Emergency signs: Yes/No

3. **View the decision**: The recommendation appears automatically

4. **Chat with the assistant**:
   - Toggle between "Strict Guideline" and "Explain" modes
   - Ask questions like:
     - "Why was this recommendation made?"
     - "What is target-organ damage?"
     - "What are the emergency signs I should look for?"
     - "Can you explain the decision path?"

### Uploading Your Own Guideline

#### Upload JSON (Instant)

1. **Click "Upload Guideline"** button
2. **Select a JSON file** that follows the schema (see `public/sample-guideline.json`)
3. The guideline will appear as a new chip and be automatically selected

#### Upload PDF (AI-Powered Conversion)

1. **Click "Upload Guideline"** button
2. **Select a PDF file** containing your clinical guideline
3. Wait 15-30 seconds while the system:
   - Extracts pages as images
   - Uses GPT-4 Vision to analyze flowcharts and decision logic
   - Converts to structured JSON format
4. The guideline will be ready to use

**Best for PDF uploads**:

- Guidelines with flowcharts or decision trees
- NICE guidelines, clinical pathways
- Visual decision algorithms
- Up to 10 pages (longer documents are truncated)

## Example Scenarios

### Scenario 1: Normal Blood Pressure

- Systolic: 120
- Diastolic: 80
- Age: 50
- Target-organ damage: No
- Emergency signs: No
- **Result**: Normal BP — recheck in 5 years

### Scenario 2: Stage 1 Hypertension with Organ Damage

- Systolic: 145
- Diastolic: 92
- Age: 65
- Target-organ damage: Yes
- Emergency signs: No
- **Result**: Start drug treatment

### Scenario 3: Severe Hypertension

- Systolic: 185
- Diastolic: 115
- Age: 70
- Target-organ damage: No
- Emergency signs: Yes
- **Result**: Same-day specialist referral (URGENT)

## Chat Mode Differences

### Strict Guideline Mode

- Rule-based responses only
- Strictly follows the decision tree
- Focuses on the exact guideline recommendation
- Best for: Quick clinical decisions

### Explain Mode

- AI-enhanced explanations
- Educational context and examples
- More detailed rationales
- Best for: Learning and understanding

## Tips

- 🔴 **Urgent warnings** appear in red when immediate action is required
- 📋 All decisions show the **decision path** taken through the tree
- 📚 Click the citation link to view the full NICE guideline
- 💡 The AI knows the current decision and patient data, so you can ask contextual questions

## Troubleshooting

### "Error: OpenAI API error"

- Check that your API key is set in `.env.local`
- Verify the key is valid
- Restart the dev server after changing `.env.local`

### Guideline upload fails

- Ensure the JSON is valid (use a JSON validator)
- Check that all required fields are present
- See `public/sample-guideline.json` for the correct format

### Build errors

- Run `npm install` to ensure all dependencies are installed
- Clear `.next` folder: `rm -rf .next`
- Rebuild: `npm run build`

## Creating Custom Guidelines

See the full documentation in `README.md` for the complete JSON schema and instructions on creating your own clinical guidelines.

## Safety Notice

⚠️ This tool is for healthcare professionals only and should not replace clinical judgment. Always consider individual patient context, contraindications, and local protocols.
