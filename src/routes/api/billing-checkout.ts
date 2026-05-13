import { createFileRoute } from '@tanstack/react-router';
import { isUnauthorizedError, json, requireUser } from '@/server/api';
import { billing } from '@/server/billingClient';
import { env } from '@/server/env';

const appUrl = () => env('ADAM_URL') || 'https://adam.new/app';

export const Route = createFileRoute('/api/billing-checkout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireUser(request);
          const body = (await request.json().catch(() => null)) as {
            priceId: string;
            trialPeriodDays?: number;
          } | null;
          if (!body || typeof body.priceId !== 'string') {
            return json({ error: 'invalid_request' }, 400);
          }
          const result = await billing.createCheckout(user.email!, {
            priceId: body.priceId,
            successUrl: appUrl(),
            cancelUrl: appUrl(),
            trialPeriodDays: body.trialPeriodDays,
          });
          return json(result);
        } catch (err) {
          return json(
            {
              error: isUnauthorizedError(err)
                ? 'Unauthorized'
                : 'checkout_failed',
            },
            isUnauthorizedError(err) ? 401 : 502,
          );
        }
      },
    },
  },
});
