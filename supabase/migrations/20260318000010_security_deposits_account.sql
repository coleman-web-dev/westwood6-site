-- Add Security Deposits Held liability account (2210) to all communities
-- that already have a chart of accounts seeded.
-- Used by the ledger import wizard when importing security deposit records.

INSERT INTO accounts (community_id, code, name, account_type, fund, is_system, normal_balance, display_order)
SELECT c.id, '2210', 'Security Deposits Held', 'liability', 'operating', false, 'credit', 225
FROM communities c
WHERE EXISTS (
  SELECT 1 FROM accounts a WHERE a.community_id = c.id AND a.code = '1000'
)
AND NOT EXISTS (
  SELECT 1 FROM accounts a WHERE a.community_id = c.id AND a.code = '2210'
);

-- Also update the seed function so new communities get this account
CREATE OR REPLACE FUNCTION seed_default_chart_of_accounts(p_community_id UUID)
RETURNS void AS $$
BEGIN
  -- Only seed if not already seeded
  IF EXISTS (SELECT 1 FROM accounts WHERE community_id = p_community_id) THEN
    RETURN;
  END IF;

  INSERT INTO accounts (community_id, code, name, account_type, fund, is_system, normal_balance, display_order) VALUES
    -- Assets
    (p_community_id, '1000', 'Operating Cash', 'asset', 'operating', true, 'debit', 100),
    (p_community_id, '1010', 'Reserve Cash', 'asset', 'reserve', true, 'debit', 105),
    (p_community_id, '1020', 'Petty Cash', 'asset', 'operating', false, 'debit', 108),
    (p_community_id, '1100', 'Accounts Receivable', 'asset', 'operating', true, 'debit', 110),
    (p_community_id, '1110', 'Special Assessment Receivable', 'asset', 'operating', false, 'debit', 115),
    (p_community_id, '1200', 'Prepaid Insurance', 'asset', 'operating', false, 'debit', 120),
    (p_community_id, '1300', 'Reserve Investments', 'asset', 'reserve', false, 'debit', 130),
    -- Liabilities
    (p_community_id, '2000', 'Accounts Payable', 'liability', 'operating', true, 'credit', 200),
    (p_community_id, '2100', 'Homeowner Prepayments', 'liability', 'operating', false, 'credit', 210),
    (p_community_id, '2110', 'Homeowner Wallet Credits', 'liability', 'operating', true, 'credit', 220),
    (p_community_id, '2200', 'Amenity Deposits Payable', 'liability', 'operating', false, 'credit', 230),
    (p_community_id, '2210', 'Security Deposits Held', 'liability', 'operating', false, 'credit', 225),
    (p_community_id, '2300', 'Accrued Expenses', 'liability', 'operating', false, 'credit', 240),
    -- Equity
    (p_community_id, '3000', 'Operating Fund Balance', 'equity', 'operating', true, 'credit', 300),
    (p_community_id, '3100', 'Reserve Fund Balance', 'equity', 'reserve', true, 'credit', 310),
    -- Revenue
    (p_community_id, '4000', 'Assessment Revenue', 'revenue', 'operating', true, 'credit', 400),
    (p_community_id, '4010', 'Special Assessment Revenue', 'revenue', 'operating', false, 'credit', 405),
    (p_community_id, '4100', 'Late Fee Revenue', 'revenue', 'operating', false, 'credit', 410),
    (p_community_id, '4200', 'Amenity Fee Revenue', 'revenue', 'operating', false, 'credit', 420),
    (p_community_id, '4300', 'Interest Income', 'revenue', 'operating', false, 'credit', 430),
    (p_community_id, '4400', 'Other Income', 'revenue', 'operating', false, 'credit', 440),
    (p_community_id, '4500', 'Estoppel Fee Revenue', 'revenue', 'operating', false, 'credit', 450),
    (p_community_id, '4600', 'Application Fee Revenue', 'revenue', 'operating', false, 'credit', 455),
    (p_community_id, '4700', 'Processing Fee Revenue', 'revenue', 'operating', false, 'credit', 460),
    -- Expenses
    (p_community_id, '5000', 'Management Fees', 'expense', 'operating', false, 'debit', 500),
    (p_community_id, '5100', 'Insurance', 'expense', 'operating', false, 'debit', 510),
    (p_community_id, '5200', 'Utilities', 'expense', 'operating', false, 'debit', 520),
    (p_community_id, '5300', 'Landscaping & Grounds', 'expense', 'operating', false, 'debit', 530),
    (p_community_id, '5400', 'Repairs & Maintenance', 'expense', 'operating', false, 'debit', 540),
    (p_community_id, '5500', 'Legal & Professional', 'expense', 'operating', false, 'debit', 550),
    (p_community_id, '5600', 'Administrative', 'expense', 'operating', false, 'debit', 560),
    (p_community_id, '5700', 'Processing Fees', 'expense', 'operating', false, 'debit', 570),
    (p_community_id, '5800', 'Bad Debt Expense', 'expense', 'operating', false, 'debit', 580),
    (p_community_id, '5900', 'Reserve Contribution', 'expense', 'operating', true, 'debit', 590),
    (p_community_id, '6000', 'Other Expense', 'expense', 'operating', false, 'debit', 600);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
