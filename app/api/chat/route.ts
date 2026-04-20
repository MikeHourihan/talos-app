import Anthropic from '@anthropic-ai/sdk';
import { getSystemPrompt } from '@/lib/system-prompt';

export const runtime = 'nodejs';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEMO_LINK = 'https://repeatmd.chilipiper.com/round-robin/default-ageless-demo';

const FORCE_DEMO_INSTRUCTION = `


# MANDATORY INSTRUCTION — THIS OVERRIDES EVERYTHING

You have asked enough questions. Do NOT ask another question under any circumstances.

Your entire response must be:
1. One sentence max acknowledging what they said.
2. The demo ask with the booking link.

Example: "That's exactly the gap Ageless closes — honestly the best way to see it is to watch it in action. Can I get you scheduled with one of our experts? Here's a link to grab a time: ${DEMO_LINK}"

NO MORE QUESTIONS. NO MORE DISCOVERY. JUST THE DEMO ASK AND THE LINK.`;

export async function POST(request: Request) {
  const { messages } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response('Invalid messages', { status: 400 });
  }

  // Count user turns — after 3, force the demo ask
  const userTurns = messages.filter((m: {role: string}) => m.role === 'user').length;
  const forceDemo = userTurns >= 3;

  const systemPrompt = getSystemPrompt() + (forceDemo ? FORCE_DEMO_INSTRUCTION : '');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          system: systemPrompt,
          messages,
        });

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }

        controller.close();
      } catch (err) {
        console.error('Anthropic stream error:', err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
