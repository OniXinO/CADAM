import { createFileRoute } from '@tanstack/react-router';
import type { Content, CoreMessage } from '@shared/types';
import { createAnthropicText } from '@/server/anthropic';
import { isRecord, isUnauthorizedError, json, requireUser } from '@/server/api';
import { getAnonSupabaseClient } from '@/server/supabaseClient';
import { formatUserMessage } from '@/server/messageUtils';

const TITLE_SYSTEM_PROMPT =
  'Generate a concise, descriptive title under 80 characters for this CAD conversation. Return only the title. If unclear, return "New Conversation".';

function isContent(value: unknown): value is Content {
  return isRecord(value);
}

export const Route = createFileRoute('/api/title-generator')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let user;
        try {
          user = await requireUser(request);
        } catch (err) {
          if (isUnauthorizedError(err)) {
            return json({ error: 'Unauthorized' }, 401);
          }
          throw err;
        }
        try {
          const body = await request.json();
          if (
            !isRecord(body) ||
            typeof body.conversationId !== 'string' ||
            !isContent(body.content)
          ) {
            return json({ title: 'New Conversation' });
          }
          const supabase = getAnonSupabaseClient({
            global: {
              headers: {
                Authorization: request.headers.get('Authorization') ?? '',
              },
            },
          });
          const message: CoreMessage = {
            id: '1',
            role: 'user',
            content: body.content,
          };
          const formatted = await formatUserMessage(
            message,
            supabase,
            user.id,
            body.conversationId,
          );
          const title = await createAnthropicText({
            model: 'claude-haiku-4-5-20251001',
            maxTokens: 100,
            system: TITLE_SYSTEM_PROMPT,
            content: formatted.content,
          });
          return json({ title: title || 'New Conversation' });
        } catch {
          return json({ title: 'New Conversation' });
        }
      },
    },
  },
});
