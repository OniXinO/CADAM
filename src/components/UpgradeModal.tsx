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

interface Tier {
  name: string;
  price: string;
  period: string;
  credits: string;
  blurb: string;
  features: string[];
  lookupKey: string; // '' for free
  popular?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    credits: '50 credits / day',
    blurb: 'Get started with Adam',
    features: ['All AI features', 'Community support'],
    lookupKey: '',
  },
  {
    name: 'Standard',
    price: '$9.99',
    period: '/mo',
    credits: '1,000 credits / mo',
    blurb: 'For regular use',
    features: ['All AI features', 'Buy add-on credit packs'],
    lookupKey: 'standard_monthly',
  },
  {
    name: 'Pro',
    price: '$29.99',
    period: '/mo',
    credits: '5,000 credits / mo',
    blurb: 'For power users',
    features: [
      'All AI features',
      'Phone number of founders',
      'Exclusive new features',
    ],
    lookupKey: 'pro_monthly',
    popular: true,
  },
];

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { subscription } = useAuth();
  const { mutate: subscribe, isPending: isSubscribing } =
    useSubscriptionService();
  const { mutate: manage, isPending: isManaging } = useManageSubscription();

  const isBusy = isSubscribing || isManaging;
  const currentTierName =
    subscription === 'pro'
      ? 'Pro'
      : subscription === 'standard'
        ? 'Standard'
        : 'Free';

  const handleClick = (tier: Tier) => {
    if (tier.name === currentTierName) return;
    if (subscription === 'free' && tier.lookupKey) {
      subscribe({ lookupKey: tier.lookupKey, source: 'upgrade_modal' });
    } else if (subscription !== 'free') {
      // Paid user changing plans — route through Stripe portal
      manage();
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
          {TIERS.map((tier) => {
            const isCurrent = tier.name === currentTierName;
            return (
              <div
                key={tier.name}
                className={cn(
                  'relative flex flex-col rounded-lg border p-5',
                  tier.popular
                    ? 'border-adam-blue/60 bg-adam-neutral-950'
                    : 'border-adam-neutral-800 bg-adam-neutral-950/60',
                )}
              >
                {tier.popular && (
                  <span className="absolute right-3 top-3 rounded-full bg-adam-blue/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-adam-blue">
                    Popular
                  </span>
                )}

                <div className="text-sm font-medium text-adam-neutral-10">
                  {tier.name}
                </div>
                <div className="text-xs text-adam-neutral-400">
                  {tier.blurb}
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-semibold">{tier.price}</span>
                  <span className="text-xs text-adam-neutral-400">
                    {tier.period}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 rounded-md bg-adam-neutral-900 px-2 py-1.5 text-xs font-medium">
                  <Zap className="h-3 w-3" fill="currentColor" />
                  <span>{tier.credits}</span>
                </div>

                <ul className="mt-3 space-y-1.5 text-xs text-adam-neutral-300">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-adam-neutral-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-4">
                  <Button
                    disabled={isCurrent || isBusy}
                    onClick={() => handleClick(tier)}
                    className={cn(
                      'h-9 w-full rounded-full text-xs font-medium',
                      isCurrent
                        ? 'bg-adam-neutral-900 text-adam-neutral-400 [@media(hover:hover)]:hover:bg-adam-neutral-900 [@media(hover:hover)]:hover:text-adam-neutral-400'
                        : tier.popular
                          ? 'bg-adam-neutral-10 text-adam-bg-dark [@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:text-adam-bg-dark'
                          : 'bg-adam-neutral-800 text-adam-neutral-10 [@media(hover:hover)]:hover:bg-adam-neutral-700 [@media(hover:hover)]:hover:text-adam-neutral-10',
                    )}
                  >
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      'Current plan'
                    ) : tier.lookupKey ? (
                      `Get ${tier.name}`
                    ) : (
                      'Downgrade'
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
