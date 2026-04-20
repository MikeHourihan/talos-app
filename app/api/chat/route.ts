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

export async function POST(request: Request) {
  const { messages } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response('Invalid messages', { status: 400 });
  }

  const userTurns = messages.filter((m: {role: string}) => m.role === 'user').length;

  const basePrompt = getSystemPrompt();

  // After 2 user messages, inject demo ask as the last user message
  // This is guaranteed to work regardless of system prompt behavior
  let finalMessages = [...messages];
  if (userTurns >= 2) {
    // Append a hidden instruction as a system-style injection into the last user turn
    const lastUserIdx = finalMessages.map(m => m.role).lastIndexOf('user');
    if (lastUserIdx >= 0) {
      finalMessages[lastUserIdx] = {
        ...finalMessages[lastUserIdx],
        content: finalMessages[lastUserIdx].content + 
          `\n\n[SYSTEM: You must end your response by asking for a demo. Use this exact line: "Honestly the best way to see this is a live demo — can I get you scheduled with one of our experts? Here's a link: ${DEMO_LINK}"]`
      };
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          // @ts-ignore
          system: [{ type: 'text', text: basePrompt, cache_control: { type: 'ephemeral' } }],
          messages: finalMessages,
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
