import Anthropic from '@anthropic-ai/sdk';
import { getSystemPrompt } from '@/lib/system-prompt';

export const runtime = 'nodejs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const DEMO_LINK = 'https://repeatmd.chilipiper.com/round-robin/default-ageless-demo';

// Affirmative answers that mean "yes, send me the link"
const YES_PATTERNS = [
  /^\s*(yes|yeah|yep|sure|ok|okay|sounds good|that works|absolutely|why not|let's do it|go ahead|please)\s*[.!]?\s*$/i,
  /^\s*(yes|yeah|yep|sure|ok|okay)\b/i,
];

export async function POST(request: Request) {
  const { messages } = await request.json();
  if (!messages || !Array.isArray(messages)) return new Response('Invalid', { status: 400 });

  const userTurns = messages.filter((m: {role: string}) => m.role === 'user').length;
  const lastUserMessage = [...messages].reverse().find((m: {role: string}) => m.role === 'user');
  const lastAssistantMessage = [...messages].reverse().find((m: {role: string}) => m.role === 'assistant');

  // Check: did the previous assistant turn propose a demo?
  const prevTurnProposedDemo = lastAssistantMessage && (
    /\bdemo\b/i.test(lastAssistantMessage.content) ||
    /\bwalkthrough\b/i.test(lastAssistantMessage.content) ||
    /\b20 minutes?\b/i.test(lastAssistantMessage.content) ||
    /\bshow you (how|it)\b/i.test(lastAssistantMessage.content)
  );

  // Check: did the user just say yes?
  const userSaidYes = lastUserMessage && YES_PATTERNS.some(p => p.test(lastUserMessage.content.trim()));

  // If they said yes to a demo proposal, short-circuit: just send the link
  if (prevTurnProposedDemo && userSaidYes) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const response = `Awesome — grab any time that works here: ${DEMO_LINK}\n\nLooking forward to it.`;
        controller.enqueue(encoder.encode(response));
        controller.close();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  // Build system prompt with demo push instruction if we're at turn 4+
  let systemPrompt = getSystemPrompt();
  if (userTurns >= 4) {
    systemPrompt += `\n\nIMPORTANT: You have done enough discovery. Your response must answer their last message in 1-2 sentences, then end with the demo ask. Example ending: "Honestly easier to show than explain — got 20 minutes for a quick walkthrough?" Do not ask another discovery question. Do not include any link yet.`;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const s = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 150,
          system: systemPrompt,
          messages,
        });
        for await (const chunk of s) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) { console.error(err); controller.error(err); }
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
