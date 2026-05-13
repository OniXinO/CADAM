import { apiJson } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

export type SubscriptionLevel = 'standard' | 'pro';

export type BillingProduct = {
  id: string;
  stripeProductId: string;
  stripePriceId: string;
  productType: 'subscription' | 'pack';
  subscriptionLevel: SubscriptionLevel | null;
  tokenAmount: number;
  name: string;
  priceCents: number;
  interval: string | null;
  active: boolean;
};

export function useSubscriptionProducts() {
  return useQuery<BillingProduct[]>({
    queryKey: ['billing', 'products', 'subscription'],
    queryFn: async () => {
      return apiJson<BillingProduct[]>('billing-products?type=subscription');
    },
  });
}
