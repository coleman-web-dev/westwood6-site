-- Backfill: add missing revenue accounts to communities that already have a chart of accounts

-- 4600 Estoppel Fee Revenue
INSERT INTO accounts (community_id, code, name, account_type, fund, is_system, normal_balance, display_order)
SELECT c.id, '4600', 'Estoppel Fee Revenue', 'revenue', 'operating', false, 'credit', 470
FROM communities c
WHERE EXISTS (SELECT 1 FROM accounts WHERE community_id = c.id LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM accounts WHERE community_id = c.id AND code = '4600');

-- 4700 Processing Fee Revenue
INSERT INTO accounts (community_id, code, name, account_type, fund, is_system, normal_balance, display_order)
SELECT c.id, '4700', 'Processing Fee Revenue', 'revenue', 'operating', false, 'credit', 480
FROM communities c
WHERE EXISTS (SELECT 1 FROM accounts WHERE community_id = c.id LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM accounts WHERE community_id = c.id AND code = '4700');
