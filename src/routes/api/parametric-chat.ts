import { createFileRoute } from '@tanstack/react-router';
import { handleParametricChatRequest } from '@/server/parametricChat';

export const Route = createFileRoute('/api/parametric-chat')({
  server: {
    handlers: {
      GET: ({ request }) => handleParametricChatRequest(request),
      POST: ({ request }) => handleParametricChatRequest(request),
      OPTIONS: ({ request }) => handleParametricChatRequest(request),
    },
  },
});
