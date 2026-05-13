import { createFileRoute } from '@tanstack/react-router';
import { handleParametricChatRequest } from '@/server/parametricChat';

export const Route = createFileRoute('/api/parametric-chat')({
  server: {
    handlers: {
      POST: ({ request }) => handleParametricChatRequest(request),
      OPTIONS: ({ request }) => handleParametricChatRequest(request),
    },
  },
});
