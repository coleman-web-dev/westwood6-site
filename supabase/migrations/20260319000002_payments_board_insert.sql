-- Allow board members to insert payments for any unit in their community
-- Needed for ledger import where board creates payments on behalf of members
CREATE POLICY "Board can insert payments"
  ON payments FOR INSERT
  WITH CHECK (is_board_member());
