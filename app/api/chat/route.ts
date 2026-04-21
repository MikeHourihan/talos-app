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

// After this many user messages, force the demo ask by appending it to every response
const DEMO_TRIGGER_TURNS = 2;

export async function POST(request: Request) {
  const { messages } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response('Invalid messages', { status: 400 });
  }

  const userTurns = messages.filter((m: {role: string}) => m.role === 'user').length;
  const basePrompt = getSystemPrompt();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          // @ts-ignore
          system: [{ type: 'text', text: basePrompt, cache_control: { type: 'ephemeral' } }],
          messages,
        } as Parameters<typeof client.messages.stream>[0]);

        let fullResponse = '';
        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            fullResponse += chunk.delta.text;
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }

        // After DEMO_TRIGGER_TURNS, always append the demo ask if not already present
        if (userTurns >= DEMO_TRIGGER_TURNS && !fullResponse.includes(DEMO_LINK)) {
          const suffix = `\n\nHonestly the best way to see how this fits your practice is a live demo — can I get you scheduled with one of our experts? Here's a link to grab a time: ${DEMO_LINK}`;
          controller.enqueue(encoder.encode(suffix));
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
