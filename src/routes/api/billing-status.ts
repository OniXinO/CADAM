import { createFileRoute } from '@tanstack/react-router';
import { isUnauthorizedError, json, requireUser } from '@/server/api';
import { billing } from '@/server/billingClient';

export const Route = createFileRoute('/api/billing-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await requireUser(request);
          return json(await billing.getStatus(user.email!));
        } catch (err) {
          return json(
            {
              error: isUnauthorizedError(err)
                ? 'Unauthorized'
                : 'billing_failed',
            },
            isUnauthorizedError(err) ? 401 : 502,
          );
        }
      },
    },
  },
});
