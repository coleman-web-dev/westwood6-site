-- Atomic wallet balance increment to prevent race conditions
CREATE OR REPLACE FUNCTION increment_wallet_balance(
  p_unit_id UUID,
  p_community_id UUID,
  p_amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO unit_wallets (unit_id, community_id, balance, updated_at)
  VALUES (p_unit_id, p_community_id, p_amount, NOW())
  ON CONFLICT (unit_id)
  DO UPDATE SET
    balance = unit_wallets.balance + p_amount,
    updated_at = NOW();
END;
$$;
