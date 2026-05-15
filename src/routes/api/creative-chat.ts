import { createFileRoute } from '@tanstack/react-router';
import { handleCreativeChatRequest } from '@/server/creativeChat';

export const Route = createFileRoute('/api/creative-chat')({
  server: {
    handlers: {
      GET: ({ request }) => handleCreativeChatRequest(request),
      POST: ({ request }) => handleCreativeChatRequest(request),
      OPTIONS: ({ request }) => handleCreativeChatRequest(request),
    },
  },
});
