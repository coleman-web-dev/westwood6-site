export type StripeMode = 'connect' | 'direct';

export interface StripeAccount {
  id: string;
  community_id: string;
  stripe_account_id: string | null;  // null in direct mode
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  application_fee_percent: number;
  mode: StripeMode;
  webhook_secret: string | null;
  stripe_product_id: string | null;
  stripe_default_price_id: string | null;
  stripe_prices: Record<string, string> | null;  // { monthly: "price_xxx", quarterly: "price_yyy", ... }
  created_at: string;
  updated_at: string;
}

export interface CreateCheckoutRequest {
  invoiceId: string;
  communityId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResponse {
  url: string;
}

export interface ConnectOnboardingResponse {
  url: string;
}

export interface SyncCustomersResponse {
  matched: number;
  unmatched: string[];
  errors: string[];
}

export interface CreateSubscriptionsResponse {
  created: number;
  skipped: number;
  errors: string[];
}

export interface PreCreateAccountsResponse {
  created: number;
  alreadyExists: number;
  errors: string[];
}

export interface CustomerPortalResponse {
  url: string;
}
