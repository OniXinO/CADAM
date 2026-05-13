import { createFileRoute } from '@tanstack/react-router';
import { handleMeshRequest } from '@/server/mesh';

export const Route = createFileRoute('/api/mesh')({
  server: {
    handlers: {
      POST: ({ request }) => handleMeshRequest(request),
      OPTIONS: ({ request }) => handleMeshRequest(request),
    },
  },
});
