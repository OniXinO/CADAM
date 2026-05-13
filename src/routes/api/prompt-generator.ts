import { createFileRoute } from '@tanstack/react-router';
import { createAnthropicText } from '@/server/anthropic';
import { json, requireUser } from '@/server/api';

const CREATIVE_PROMPT =
  'Generate a short creative prompt for an organic 3D form, character, figurine, sculpture, or artistic object. Return only the prompt text.';
const PARAMETRIC_PROMPT =
  'Generate a short prompt for a practical dimensional household object or functional part. Include dimensions when useful. Return only the prompt text.';

export const Route = createFileRoute('/api/prompt-generator')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireUser(request);
          const body = (await request.json().catch(() => ({}))) as {
            existingText?: string;
            type?: 'parametric' | 'creative';
          };
          const base =
            body.type === 'parametric' ? PARAMETRIC_PROMPT : CREATIVE_PROMPT;
          const content = body.existingText
            ? `${base}\n\nImprove this existing prompt while preserving its intent:\n${body.existingText}`
            : base;
          const prompt = await createAnthropicText({
            model: 'claude-haiku-4-5-20251001',
            maxTokens: 200,
            system:
              'You write concise 3D generation prompts. Return only the prompt text, no quotes or explanation.',
            content,
          });
          return json({ prompt });
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : 'prompt_failed' },
            err instanceof Error && err.message === 'Unauthorized' ? 401 : 500,
          );
        }
      },
    },
  },
});
