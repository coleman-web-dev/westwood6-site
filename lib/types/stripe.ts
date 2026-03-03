export interface StripeAccount {
  id: string;
  community_id: string;
  stripe_account_id: string;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  application_fee_percent: number;
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
