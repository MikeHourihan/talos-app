import Anthropic from '@anthropic-ai/sdk';
import { getSystemPrompt } from '@/lib/system-prompt';

export const runtime = 'nodejs';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders: {
    'anthropic-beta': 'prompt-caching-2024-07-31',
  },
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

  const userTurns = messages.filter((m: {role: string}) => m.role === 'user').length;
  const forceDemo = userTurns >= 2;

  const basePrompt = getSystemPrompt();
  const systemPrompt = forceDemo ? basePrompt + FORCE_DEMO_INSTRUCTION : basePrompt;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              // @ts-ignore
              cache_control: { type: 'ephemeral' },
            }
          ],
          messages,
        } as Parameters<typeof client.messages.stream>[0]);

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
    },
  });
}
