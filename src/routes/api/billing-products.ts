import { createFileRoute } from '@tanstack/react-router';
import { billing } from '@/server/billingClient';
import { json } from '@/server/api';

export const Route = createFileRoute('/api/billing-products')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const type = new URL(request.url).searchParams.get('type');
        if (type === 'subscription' || type === 'pack') {
          return json(await billing.getProductsByType(type));
        }
        return json(await billing.getAllProducts());
      },
    },
  },
});
