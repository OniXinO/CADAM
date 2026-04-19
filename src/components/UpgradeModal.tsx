import { useState } from 'react';
import { Check, Loader2, Zap } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  useManageSubscription,
  useSubscriptionService,
} from '@/services/subscriptionService';
import { cn } from '@/lib/utils';
import { PLAN_ORDER, PRICING_PLANS, creditsBadgeLabel } from '@/config/pricing';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { subscription } = useAuth();
  const { mutate: subscribe, isPending: isSubscribing } =
    useSubscriptionService();
  const { mutate: manage, isPending: isManaging } = useManageSubscription();

  // Track which tier's button was clicked so only that one shows a spinner
  // (rather than spinning every button the moment any mutation is in flight).
  const [activeLookupKey, setActiveLookupKey] = useState<string | null>(null);

  const currentTierName =
    subscription === 'pro'
      ? 'Pro'
      : subscription === 'standard'
        ? 'Standard'
        : 'Free';

  const isAnyBusy = isSubscribing || isManaging;

  const handleClick = (lookupKey: string, planName: string) => {
    if (planName === currentTierName) return;
    setActiveLookupKey(lookupKey);
    if (subscription === 'free' && lookupKey) {
      subscribe(
        { lookupKey, source: 'upgrade_modal' },
        { onSettled: () => setActiveLookupKey(null) },
      );
    } else if (subscription !== 'free') {
      // Paid user changing plans — route through Stripe portal
      manage(undefined, { onSettled: () => setActiveLookupKey(null) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-6xl overflow-y-auto border-adam-neutral-800 bg-adam-bg-secondary-dark p-10 text-adam-neutral-10 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Upgrade your plan
          </DialogTitle>
          <DialogDescription className="text-sm text-adam-neutral-400">
            All plans include every AI feature. Upgrade for more credits.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
          {PLAN_ORDER.map((planName) => {
            const plan = PRICING_PLANS[planName];
            const isCurrent = plan.name === currentTierName;
            const lookupKey = plan.monthlyLookupKey;
            const isThisBusy = activeLookupKey === lookupKey && isAnyBusy;

            return (
              <div
                key={plan.name}
                className={cn(
                  'relative flex flex-col rounded-lg border p-5',
                  plan.popular
                    ? 'border-adam-blue/60 bg-adam-neutral-950'
                    : 'border-adam-neutral-800 bg-adam-neutral-950/60',
                )}
              >
                {plan.popular && (
                  <span className="absolute right-3 top-3 rounded-full bg-adam-blue/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-adam-blue">
                    Popular
                  </span>
                )}

                <div className="text-sm font-medium text-adam-neutral-10">
                  {plan.name}
                </div>
                <div className="text-xs text-adam-neutral-400">
                  {plan.description}
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-semibold">
                    ${plan.monthlyPrice}
                  </span>
                  <span className="text-xs text-adam-neutral-400">/mo</span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 rounded-md bg-adam-neutral-900 px-2 py-1.5 text-xs font-medium">
                  <Zap className="h-3 w-3" fill="currentColor" />
                  <span>{creditsBadgeLabel(plan)}</span>
                </div>

                <ul className="mt-3 space-y-1.5 text-xs text-adam-neutral-300">
                  {plan.extraFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-1.5">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-adam-neutral-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-4">
                  <Button
                    disabled={isCurrent || isAnyBusy}
                    onClick={() => handleClick(lookupKey, plan.name)}
                    className={cn(
                      'h-9 w-full rounded-full text-xs font-medium',
                      isCurrent
                        ? 'bg-adam-neutral-900 text-adam-neutral-400 [@media(hover:hover)]:hover:bg-adam-neutral-900 [@media(hover:hover)]:hover:text-adam-neutral-400'
                        : plan.popular
                          ? 'bg-adam-neutral-10 text-adam-bg-dark [@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:text-adam-bg-dark'
                          : 'bg-adam-neutral-800 text-adam-neutral-10 [@media(hover:hover)]:hover:bg-adam-neutral-700 [@media(hover:hover)]:hover:text-adam-neutral-10',
                    )}
                  >
                    {isThisBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      'Current plan'
                    ) : plan.name === 'Free' ? (
                      'Downgrade'
                    ) : (
                      `Get ${plan.name}`
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
