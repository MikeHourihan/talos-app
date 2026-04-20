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

  cachedPrompt = `# TALOS BEHAVIORAL GUIDELINES

${guidelines}

# AGELESS PRODUCT KNOWLEDGE BASE

${knowledgeBase}${notionDocs ? `

# ADDITIONAL PRODUCT DOCUMENTATION

${notionDocs}` : ''}`;

  return cachedPrompt;
}
