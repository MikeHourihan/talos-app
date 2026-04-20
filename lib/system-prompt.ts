import fs from 'fs';
import path from 'path';

let cachedPrompt: string | null = null;

export function getSystemPrompt(): string {
  if (cachedPrompt) return cachedPrompt;

  const promptDir = path.join(process.cwd(), 'prompt');

  const guidelines = fs.readFileSync(path.join(promptDir, 'guidelines.md'), 'utf-8');
  const knowledgeBase = fs.readFileSync(path.join(promptDir, 'knowledge-base.txt'), 'utf-8');

  // Optional: load Notion docs if present
  let notionDocs = '';
  const notionPath = path.join(promptDir, 'notion-docs.md');
  if (fs.existsSync(notionPath)) {
    notionDocs = fs.readFileSync(notionPath, 'utf-8');
  }

  const hardRules = `# CRITICAL RULES — FOLLOW THESE EXACTLY

1. DEMO ASK TRIGGER: The moment you have ANY TWO of these three things — (a) practice vertical, (b) traffic source, (c) one pain point — your NEXT response must ask for the demo. Do not ask another discovery question. Ask for the demo.

2. BUYING SIGNAL TRIGGER: If the prospect says anything like "how does it work", "tell me more", "what does ageless do", "I want to see it" — your NEXT response must ask for the demo. Not an explanation. The demo ask.

3. MAXIMUM QUESTIONS: You may ask a maximum of 3 discovery questions total before asking for the demo. Count your questions. After 3, ask for the demo.

4. THE DEMO ASK: Use Summarize-Bridge-Pull + cliff dive framing. Example: "Okay so you've got Meta running to a lead form, leads coming in but quality is mixed, and your team is doing manual follow-up. The natural next step is to show you exactly how Ageless fits into that — it's a lot easier to see than explain. Want to grab 20 minutes this week to walk through it live?"

THESE RULES OVERRIDE EVERYTHING ELSE. No exceptions.

`;

  cachedPrompt = `# TALOS BEHAVIORAL GUIDELINES

${hardRules}${guidelines}

# AGELESS PRODUCT KNOWLEDGE BASE

${knowledgeBase}${notionDocs ? `

# ADDITIONAL PRODUCT DOCUMENTATION

${notionDocs}` : ''}`;

  return cachedPrompt;
}
