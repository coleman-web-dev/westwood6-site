-- Multi-subscription support: a unit can have a regular dues subscription
-- AND one or more special assessment subscriptions running concurrently.

CREATE TABLE unit_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_subscription_status text NOT NULL DEFAULT 'active',
  stripe_price_id text,
  payment_frequency text,
  preferred_billing_day integer,
  -- For special assessments: fixed number of installments
  total_installments integer,         -- NULL = infinite (regular dues)
  installments_paid integer DEFAULT 0,
  cancel_at timestamptz,              -- mirrors Stripe cancel_at
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_unit_subscriptions_stripe_id ON unit_subscriptions(stripe_subscription_id);
CREATE INDEX idx_unit_subscriptions_unit ON unit_subscriptions(unit_id);
CREATE INDEX idx_unit_subscriptions_assessment ON unit_subscriptions(assessment_id);

-- RLS
ALTER TABLE unit_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own unit subscriptions"
  ON unit_subscriptions FOR SELECT
  USING (unit_id = get_my_unit_id() OR is_board_member());

CREATE POLICY "Board can manage subscriptions"
  ON unit_subscriptions FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

-- Allow service role / webhooks to INSERT subscriptions for any unit
-- (the checkout webhook creates subscriptions on behalf of residents)
CREATE POLICY "Authenticated users can insert own unit subscriptions"
  ON unit_subscriptions FOR INSERT
  WITH CHECK (unit_id = get_my_unit_id());

-- Stripe price columns on assessments for special assessment autopay
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS stripe_product_id text;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Migrate existing subscription data from units into the new table
INSERT INTO unit_subscriptions (
  unit_id, community_id, assessment_id,
  stripe_subscription_id, stripe_subscription_status,
  preferred_billing_day, payment_frequency
)
SELECT
  u.id,
  u.community_id,
  a.id,
  u.stripe_subscription_id,
  COALESCE(u.stripe_subscription_status, 'active'),
  u.preferred_billing_day,
  u.payment_frequency
FROM units u
LEFT JOIN assessments a ON a.community_id = u.community_id AND a.is_active = true AND a.type = 'regular'
WHERE u.stripe_subscription_id IS NOT NULL;
