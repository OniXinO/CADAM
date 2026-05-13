import { createFileRoute } from '@tanstack/react-router';
import { json, requireUser } from '@/server/api';
import { billing } from '@/server/billingClient';
import { env } from '@/server/env';

const appUrl = () => env('ADAM_URL') || 'https://adam.new/app';

export const Route = createFileRoute('/api/billing-checkout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireUser(request);
          const body = (await request.json()) as {
            priceId: string;
            trialPeriodDays?: number;
          };
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
              error:
                err instanceof Error && err.message === 'Unauthorized'
                  ? 'Unauthorized'
                  : 'checkout_failed',
            },
            err instanceof Error && err.message === 'Unauthorized' ? 401 : 502,
          );
        }
      },
    },
  },
});
