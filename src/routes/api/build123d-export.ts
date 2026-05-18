import { createFileRoute } from '@tanstack/react-router';
import { handleBuild123dExportRequest } from '@/server/build123dExport';

export const Route = createFileRoute('/api/build123d-export')({
  server: {
    handlers: {
      POST: ({ request }) => handleBuild123dExportRequest(request),
      OPTIONS: ({ request }) => handleBuild123dExportRequest(request),
    },
  },
});
