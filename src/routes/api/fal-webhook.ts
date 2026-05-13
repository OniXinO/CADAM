import { createFileRoute } from '@tanstack/react-router';
import { handleFalWebhookRequest } from '@/server/falWebhook';

export const Route = createFileRoute('/api/fal-webhook')({
  server: {
    handlers: {
      POST: ({ request }) => handleFalWebhookRequest(request),
      GET: () => new Response('ok', { status: 200 }),
    },
  },
});
