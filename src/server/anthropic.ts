import { requiredEnv } from './env';

type AnthropicContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | {
          type: 'image';
          source:
            | {
                type: 'base64';
                media_type:
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/gif'
                  | 'image/webp';
                data: string;
              }
            | { type: 'url'; url: string };
        }
    >;

export async function createAnthropicText({
  model,
  system,
  content,
  maxTokens,
}: {
  model: string;
  system: string;
  content: AnthropicContent;
  maxTokens: number;
}): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': requiredEnv('ANTHROPIC_API_KEY'),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!response.ok) {
    throw new Error(`anthropic ${response.status}: ${await response.text()}`);
  }
  const data = (await response.json()) as {
    content: Array<{ type: 'text'; text: string }>;
  };
  return data.content.find((part) => part.type === 'text')?.text.trim() ?? '';
}
