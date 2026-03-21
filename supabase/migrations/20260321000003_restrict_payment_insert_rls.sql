-- Restrict payment INSERT to board members only.
-- Residents should only create payments through Stripe checkout (which uses the admin client).
-- The previous policy allowed any member to insert payments for their own unit,
-- which let residents create fake payment records via the Record Payment button.

DROP POLICY IF EXISTS "Members can create payments for their unit" ON payments;

CREATE POLICY "Board can create payments"
  ON payments FOR INSERT
  WITH CHECK (is_board_member());
