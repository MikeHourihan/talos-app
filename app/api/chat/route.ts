import Anthropic from '@anthropic-ai/sdk';
import { getSystemPrompt } from '@/lib/system-prompt';

export const runtime = 'nodejs';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEMO_LINK = 'https://repeatmd.chilipiper.com/round-robin/default-ageless-demo';
const DEMO_TRIGGER_TURNS = 2;

export async function POST(request: Request) {
  const { messages } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response('Invalid messages', { status: 400 });
  }

  const userTurns = messages.filter((m: {role: string}) => m.role === 'user').length;
  const systemPrompt = getSystemPrompt();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          system: systemPrompt,
          messages,
        });

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
