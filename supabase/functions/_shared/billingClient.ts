// HTTP client for the shared adam-billing service. Mirrors
// onshape-extension/src/lib/billing/client.ts so CADAM and onshape behave
// identically against the same endpoints.

export type SubscriptionLevel = 'standard' | 'pro';

export type BillingStatus = {
  user: {
    hasTrialed: boolean;
  };
  subscription: {
    level: SubscriptionLevel;
    status: string | null;
    currentPeriodEnd: string | null;
  } | null;
  tokens: {
    free: number;
    subscription: number;
    purchased: number;
    total: number;
  };
};

export type ConsumeSuccess = {
  ok: true;
  tokensDeducted: number;
  freeBalance: number;
  subscriptionBalance: number;
  purchasedBalance: number;
  totalBalance: number;
};

export type ConsumeFailure = {
  ok: false;
  reason: 'insufficient_tokens';
  tokensRequired: number;
  tokensAvailable: number;
  tokensDeducted: number;
};

export type ConsumeResult = ConsumeSuccess | ConsumeFailure;

export type RefundResult = {
  ok: true;
  tokensRefunded: number;
  source: 'subscription' | 'purchased';
  freeBalance: number;
  subscriptionBalance: number;
  purchasedBalance: number;
  totalBalance: number;
};

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

export class BillingClientError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// Local dev bypass: when ENVIRONMENT=local, every billing.* method short-
// circuits with canned data so the app runs without adam-billing creds.
const isBypassed = (): boolean => Deno.env.get('ENVIRONMENT') === 'local';

const DEV_TOKENS = {
  free: 1_000_000,
  subscription: 1_000_000,
  purchased: 1_000_000,
  total: 3_000_000,
};

const devStatus = (): BillingStatus => ({
  user: { hasTrialed: false },
  subscription: {
    level: 'pro',
    status: 'active',
    currentPeriodEnd: new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  },
  tokens: { ...DEV_TOKENS },
});

const devConsume = (tokens: number): ConsumeSuccess => ({
  ok: true,
  tokensDeducted: tokens,
  freeBalance: DEV_TOKENS.free,
  subscriptionBalance: DEV_TOKENS.subscription,
  purchasedBalance: DEV_TOKENS.purchased,
  totalBalance: DEV_TOKENS.total,
});

const devRefund = (tokens: number): RefundResult => ({
  ok: true,
  tokensRefunded: tokens,
  source: 'subscription',
  freeBalance: DEV_TOKENS.free,
  subscriptionBalance: DEV_TOKENS.subscription,
  purchasedBalance: DEV_TOKENS.purchased,
  totalBalance: DEV_TOKENS.total,
});

const devProducts: { subscriptions: BillingProduct[]; packs: BillingProduct[] } = {
  subscriptions: [
    {
      id: 'dev_standard_monthly',
      stripeProductId: 'prod_dev_standard',
      stripePriceId: 'price_dev_standard_monthly',
      productType: 'subscription',
      subscriptionLevel: 'standard',
      tokenAmount: 500_000,
      name: 'Standard',
      priceCents: 1900,
      interval: 'month',
      active: true,
    },
    {
      id: 'dev_pro_monthly',
      stripeProductId: 'prod_dev_pro',
      stripePriceId: 'price_dev_pro_monthly',
      productType: 'subscription',
      subscriptionLevel: 'pro',
      tokenAmount: 2_000_000,
      name: 'Pro',
      priceCents: 4900,
      interval: 'month',
      active: true,
    },
  ],
  packs: [
    {
      id: 'dev_pack_small',
      stripeProductId: 'prod_dev_pack_small',
      stripePriceId: 'price_dev_pack_small',
      productType: 'pack',
      subscriptionLevel: null,
      tokenAmount: 100_000,
      name: 'Token Pack',
      priceCents: 1000,
      interval: null,
      active: true,
    },
  ],
};

const devCheckoutError = () =>
  new BillingClientError('billing bypassed in local dev mode', 503, {
    reason: 'bypassed',
  });

const baseUrl = (): string => {
  const url = Deno.env.get('BILLING_SERVICE_URL');
  if (!url) throw new Error('BILLING_SERVICE_URL is not set');
  return url.replace(/\/$/, '');
};

const apiKey = (): string => {
  const key = Deno.env.get('BILLING_SERVICE_KEY');
  if (!key) throw new Error('BILLING_SERVICE_KEY is not set');
  return key;
};

type CallOptions = {
  allowStatus?: number[];
};

const call = async <T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  options?: CallOptions,
): Promise<T> => {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok && !options?.allowStatus?.includes(res.status)) {
    throw new BillingClientError(
      `billing ${method} ${path} -> ${res.status}`,
      res.status,
      parsed,
    );
  }
  return parsed as T;
};

const enc = (email: string): string => encodeURIComponent(email.toLowerCase());

type ConsumeBody = {
  tokens: number;
  operation?: string;
  referenceId?: string;
};

type RefundBody = {
  tokens: number;
  operation?: string;
  referenceId?: string;
};

type CheckoutBody = {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialPeriodDays?: number;
};

type CancelSubscriptionBody = {
  feedback?:
    | 'customer_service'
    | 'low_quality'
    | 'missing_features'
    | 'other'
    | 'switched_service'
    | 'too_complex'
    | 'too_expensive'
    | 'unused';
  comment?: string;
};

export type CancelSubscriptionResult =
  | { canceled: true }
  | { canceled: false; reason: 'no_subscription' | 'already_canceled' };

export const billing = {
  getStatus: (email: string) => {
    if (isBypassed()) return Promise.resolve(devStatus());
    return call<BillingStatus>('GET', `/v1/users/${enc(email)}/status`);
  },

  consume: (email: string, body: ConsumeBody) => {
    if (isBypassed()) return Promise.resolve<ConsumeResult>(devConsume(body.tokens));
    return call<ConsumeResult>('POST', `/v1/users/${enc(email)}/consume`, body, {
      allowStatus: [422],
    });
  },

  refund: (email: string, body: RefundBody) => {
    if (isBypassed()) return Promise.resolve(devRefund(body.tokens));
    return call<RefundResult>('POST', `/v1/users/${enc(email)}/refund`, body);
  },

  createCheckout: (email: string, body: CheckoutBody) => {
    if (isBypassed()) return Promise.reject(devCheckoutError());
    return call<{ url: string }>('POST', `/v1/users/${enc(email)}/checkout`, body);
  },

  createPortal: (email: string, body: { returnUrl: string }) => {
    if (isBypassed()) return Promise.reject(devCheckoutError());
    return call<{ url: string }>('POST', `/v1/users/${enc(email)}/portal`, body);
  },

  cancelSubscription: (email: string, body: CancelSubscriptionBody = {}) => {
    if (isBypassed())
      return Promise.resolve<CancelSubscriptionResult>({ canceled: true });
    return call<CancelSubscriptionResult>(
      'POST',
      `/v1/users/${enc(email)}/cancel-subscription`,
      body,
    );
  },

  getProductsByType: (type: 'subscription' | 'pack') => {
    if (isBypassed()) {
      return Promise.resolve(
        type === 'subscription' ? devProducts.subscriptions : devProducts.packs,
      );
    }
    return call<BillingProduct[]>('GET', `/v1/products?type=${type}`);
  },

  getAllProducts: () => {
    if (isBypassed()) {
      return Promise.resolve({
        subscriptions: devProducts.subscriptions,
        packs: devProducts.packs,
      });
    }
    return call<{ subscriptions: BillingProduct[]; packs: BillingProduct[] }>(
      'GET',
      '/v1/products',
    );
  },
};
