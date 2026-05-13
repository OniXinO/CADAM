import { env, requiredEnv } from './env';

export type SubscriptionLevel = 'standard' | 'pro';

export type BillingStatus = {
  user: { hasTrialed: boolean };
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

const DEV_TOKENS = {
  free: 1_000_000,
  subscription: 1_000_000,
  purchased: 1_000_000,
  total: 3_000_000,
};

const isBypassed = () => env('ENVIRONMENT') === 'local';

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

const baseUrl = () => requiredEnv('BILLING_SERVICE_URL').replace(/\/$/, '');
const apiKey = () => requiredEnv('BILLING_SERVICE_KEY');
const enc = (email: string) => encodeURIComponent(email.toLowerCase());

type CallOptions = {
  allowStatus?: number[];
};

async function call<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  options?: CallOptions,
): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : undefined;
  if (!res.ok && !options?.allowStatus?.includes(res.status)) {
    throw new BillingClientError(
      `billing ${method} ${path} -> ${res.status}`,
      res.status,
      parsed,
    );
  }
  return parsed as T;
}

type ConsumeBody = {
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
};

const devSubscriptions: BillingProduct[] = [
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
];

const devPacks: BillingProduct[] = [
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
];

const devCheckoutError = () =>
  new BillingClientError('billing bypassed in local dev mode', 503, {
    reason: 'bypassed',
  });

export const billing = {
  getStatus(email: string) {
    if (isBypassed()) return Promise.resolve(devStatus());
    return call<BillingStatus>('GET', `/v1/users/${enc(email)}/status`);
  },

  consume(email: string, body: ConsumeBody) {
    if (isBypassed())
      return Promise.resolve<ConsumeResult>(devConsume(body.tokens));
    return call<ConsumeResult>(
      'POST',
      `/v1/users/${enc(email)}/consume`,
      body,
      {
        allowStatus: [422],
      },
    );
  },

  createCheckout(email: string, body: CheckoutBody) {
    if (isBypassed()) return Promise.reject(devCheckoutError());
    return call<{ url: string }>(
      'POST',
      `/v1/users/${enc(email)}/checkout`,
      body,
    );
  },

  createPortal(email: string, body: { returnUrl: string }) {
    if (isBypassed()) return Promise.reject(devCheckoutError());
    return call<{ url: string }>(
      'POST',
      `/v1/users/${enc(email)}/portal`,
      body,
    );
  },

  cancelSubscription(email: string, body: CancelSubscriptionBody = {}) {
    if (isBypassed()) return Promise.resolve({ canceled: true });
    return call<{ canceled: true } | { canceled: false; reason: string }>(
      'POST',
      `/v1/users/${enc(email)}/cancel-subscription`,
      body,
    );
  },

  getProductsByType(type: 'subscription' | 'pack') {
    if (isBypassed()) {
      return Promise.resolve(
        type === 'subscription' ? devSubscriptions : devPacks,
      );
    }
    return call<BillingProduct[]>('GET', `/v1/products?type=${type}`);
  },

  async getAllProducts() {
    if (isBypassed()) {
      return { subscriptions: devSubscriptions, packs: devPacks };
    }
    return call<{ subscriptions: BillingProduct[]; packs: BillingProduct[] }>(
      'GET',
      '/v1/products',
    );
  },
};
