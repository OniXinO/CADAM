import { apiJson } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import type { BillingProduct } from '@/hooks/useBillingProducts';

export function useTokenPacks() {
  return useQuery<BillingProduct[]>({
    queryKey: ['billing', 'products', 'pack'],
    queryFn: async () => {
      const products = await apiJson<BillingProduct[]>(
        'billing-products?type=pack',
      );
      return [...products].sort((a, b) => a.tokenAmount - b.tokenAmount);
    },
  });
}
