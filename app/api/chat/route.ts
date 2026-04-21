import Anthropic from '@anthropic-ai/sdk';
import { getSystemPrompt } from '@/lib/system-prompt';

export const runtime = 'nodejs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const DEMO_LINK = 'https://repeatmd.chilipiper.com/round-robin/default-ageless-demo';

export async function POST(request: Request) {
  const { messages } = await request.json();
  if (!messages || !Array.isArray(messages)) return new Response('Invalid', { status: 400 });

  const userTurns = messages.filter((m: {role: string}) => m.role === 'user').length;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const s = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 180,
          system: getSystemPrompt(),
          messages,
        });
        let full = '';
        for await (const chunk of s) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            full += chunk.delta.text;
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        if (userTurns >= 2 && !full.includes(DEMO_LINK)) {
          const suffix = '\n\nHere\'s a link to book directly — grab whatever time works: ' + DEMO_LINK;
          controller.enqueue(encoder.encode(suffix));
        }
        controller.close();
      } catch (err) { console.error(err); controller.error(err); }
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
