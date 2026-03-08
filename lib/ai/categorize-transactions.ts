import { getAnthropicClient } from '@/lib/ai/anthropic';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────

interface PendingTransaction {
  id: string;
  name: string;
  merchant_name: string | null;
  amount: number;
  date: string;
  plaid_bank_account_id: string;
}

interface AICategorization {
  transaction_id: string;
  account_code: string;
  confidence: number;
  reasoning: string;
  vendor_match?: string;
}

interface CategorizeResult {
  auto_categorized: number;
  suggested: number;
  uncertain: number;
}

// ─── Constants ───────────────────────────────────────────────────

const AI_CONFIDENCE_AUTO = 0.85;
const AI_CONFIDENCE_SUGGEST = 0.50;
const HIGH_AMOUNT_THRESHOLD = 500000; // $5,000 in cents
const HIGH_AMOUNT_AUTO_THRESHOLD = 0.92;
const BATCH_SIZE = 50;

// ─── Name Normalization ──────────────────────────────────────────

export function normalizeTransactionName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(pos|ach|debit|credit|wire|check|eft|pmt|pmnt|payment|purchase|preauthorized)\s+/i, '')
    .replace(/\s*(xxxx?\d{4}|\*{3,}\d{4}|\d{4,})\s*/g, ' ')
    .replace(/\s+\d{2}\/\d{2}\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Prompt Builder ──────────────────────────────────────────────

function buildSystemPrompt(
  accounts: { code: string; name: string; account_type: string }[],
  memoryHints: { normalized_name: string; account_code: string; derived_confidence: number }[],
  vendors: { name: string; company: string | null }[],
): string {
  const accountList = accounts
    .map((a) => `${a.code} - ${a.name} (${a.account_type})`)
    .join('\n');

  const memoryList =
    memoryHints.length > 0
      ? memoryHints
          .map(
            (m) =>
              `"${m.normalized_name}" -> ${m.account_code} (confidence: ${(m.derived_confidence * 100).toFixed(0)}%)`,
          )
          .join('\n')
      : 'No previous patterns available.';

  const vendorList =
    vendors.length > 0
      ? vendors.map((v) => `${v.name}${v.company ? ` (${v.company})` : ''}`).join('\n')
      : 'No vendors on file.';

  return `You are a bookkeeper for a Homeowners Association (HOA). Your job is to categorize bank transactions into the correct General Ledger (GL) account.

HOA CONTEXT:
HOAs collect dues from homeowners and pay for community expenses. Common transaction types:
- INCOME: Assessment dues (monthly/quarterly/annual), late fees, amenity rental fees, interest income, homeowner payments
- EXPENSES: Landscaping/lawn care, property insurance, utilities (water, electric, gas, sewer), management company fees, legal/CPA fees, general maintenance and repairs, office/admin costs, payment processing fees (Stripe), pool/clubhouse upkeep, pest control, trash/waste removal, security, cleaning services

CHART OF ACCOUNTS:
${accountList}

KNOWN PATTERNS FROM PREVIOUS CATEGORIZATIONS:
${memoryList}

COMMUNITY VENDORS:
${vendorList}

RULES:
1. Choose the MOST SPECIFIC account that matches. Landscaping goes to 5100, not 5000.
2. Money LEAVING the account (positive amounts) is typically an expense. Money ENTERING (negative amounts) is typically revenue.
3. Bank fees, service charges, and wire fees go to Administrative (5600) or Processing Fees (5700).
4. Transfers between the HOA's own accounts should NOT be categorized as expense or revenue. Use the appropriate asset account (1000 or 1010).
5. If a transaction clearly matches a vendor in the COMMUNITY VENDORS list, include the vendor name in vendor_match.
6. Set confidence based on certainty:
   - 0.95-1.0: Obvious match (e.g., "DUKE ENERGY" -> Utilities)
   - 0.80-0.94: Very likely based on name/context
   - 0.50-0.79: Reasonable guess but could be wrong
   - 0.10-0.49: Uncertain, multiple accounts could apply
   - 0.0-0.09: No idea, needs human review
7. For reasoning, write ONE short sentence explaining why.
8. If a KNOWN PATTERN matches with high confidence, use that mapping.

Return ONLY valid JSON with no markdown code fences:
{
  "categorizations": [
    {
      "transaction_id": "uuid-here",
      "account_code": "5100",
      "confidence": 0.95,
      "reasoning": "TruGreen is a lawn care company.",
      "vendor_match": "TruGreen"
    }
  ]
}`;
}

// ─── AI Call (Batched) ───────────────────────────────────────────

async function callAI(
  systemPrompt: string,
  transactions: PendingTransaction[],
): Promise<AICategorization[]> {
  const client = getAnthropicClient();

  const txnList = transactions
    .map(
      (t) =>
        `- ID: ${t.id} | Name: "${t.name}" | Merchant: "${t.merchant_name || 'N/A'}" | Amount: ${t.amount > 0 ? '-' : '+'}$${(Math.abs(t.amount) / 100).toFixed(2)} | Date: ${t.date}`,
    )
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Categorize these ${transactions.length} bank transactions:\n\n${txnList}`,
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const parsed = JSON.parse(text);
    return (parsed.categorizations || []) as AICategorization[];
  } catch {
    console.error('AI categorization: failed to parse response', text.slice(0, 200));
    return [];
  }
}

// ─── Journal Entry Creator (server-side, no auth check) ──────────

async function createJournalEntryForTxn(
  admin: SupabaseClient,
  communityId: string,
  txn: PendingTransaction,
  accountId: string,
  bankAccountGlId: string,
  vendorId: string | null,
): Promise<string | null> {
  const amountCents = Math.abs(txn.amount);
  const isExpense = txn.amount > 0; // Positive = money leaving (Plaid convention)

  const { data: entry, error: entryError } = await admin
    .from('journal_entries')
    .insert({
      community_id: communityId,
      entry_date: txn.date,
      description: txn.merchant_name || txn.name,
      source: 'bank_sync',
      status: 'posted',
      posted_at: new Date().toISOString(),
      vendor_id: vendorId,
    })
    .select('id')
    .single();

  if (entryError || !entry) {
    console.error('AI categorization: failed to create journal entry', entryError);
    return null;
  }

  const lines = isExpense
    ? [
        { journal_entry_id: entry.id, account_id: accountId, debit: amountCents, credit: 0 },
        { journal_entry_id: entry.id, account_id: bankAccountGlId, debit: 0, credit: amountCents },
      ]
    : [
        { journal_entry_id: entry.id, account_id: bankAccountGlId, debit: amountCents, credit: 0 },
        { journal_entry_id: entry.id, account_id: accountId, debit: 0, credit: amountCents },
      ];

  const { error: lineError } = await admin.from('journal_lines').insert(lines);
  if (lineError) {
    console.error('AI categorization: failed to create journal lines', lineError);
    await admin.from('journal_entries').delete().eq('id', entry.id);
    return null;
  }

  return entry.id;
}

// ─── Orchestrator ────────────────────────────────────────────────

export async function categorizeAndApplyAI(
  admin: SupabaseClient,
  communityId: string,
): Promise<CategorizeResult> {
  // 1. Fetch remaining pending transactions
  const { data: pending } = await admin
    .from('bank_transactions')
    .select('id, name, merchant_name, amount, date, plaid_bank_account_id')
    .eq('community_id', communityId)
    .eq('status', 'pending');

  if (!pending || pending.length === 0) {
    return { auto_categorized: 0, suggested: 0, uncertain: 0 };
  }

  // 2. Fetch community's chart of accounts
  const { data: accounts } = await admin
    .from('accounts')
    .select('id, code, name, account_type')
    .eq('community_id', communityId)
    .eq('is_active', true)
    .order('display_order');

  if (!accounts || accounts.length === 0) {
    return { auto_categorized: 0, suggested: 0, uncertain: 0 };
  }

  const accountByCode = new Map(accounts.map((a) => [a.code, a]));

  // 3. Fetch vendors
  const { data: vendors } = await admin
    .from('vendors')
    .select('id, name, company')
    .eq('community_id', communityId)
    .eq('status', 'active');

  const vendorByName = new Map(
    (vendors || []).map((v) => [v.name.toLowerCase(), v.id]),
  );

  // 4. Fetch relevant memory entries
  const normalizedNames = [
    ...new Set(
      pending.map((t) => normalizeTransactionName(t.merchant_name || t.name)),
    ),
  ].filter((n) => n.length >= 3);

  let memoryHints: { normalized_name: string; account_code: string; derived_confidence: number }[] = [];
  if (normalizedNames.length > 0) {
    const { data: memory } = await admin
      .from('ai_categorization_memory')
      .select('normalized_name, account_code, derived_confidence')
      .in('normalized_name', normalizedNames)
      .gte('derived_confidence', 0.5)
      .order('derived_confidence', { ascending: false });
    memoryHints = memory || [];
  }

  // 5. Fetch bank account GL mappings
  const bankAccountIds = [...new Set(pending.map((t) => t.plaid_bank_account_id))];
  const { data: bankAccounts } = await admin
    .from('plaid_bank_accounts')
    .select('id, gl_account_id')
    .in('id', bankAccountIds);

  const bankGlMap = new Map(
    (bankAccounts || [])
      .filter((b) => b.gl_account_id)
      .map((b) => [b.id, b.gl_account_id as string]),
  );

  // 6. Build system prompt
  const systemPrompt = buildSystemPrompt(accounts, memoryHints, vendors || []);

  // 7. Batch and call AI
  let autoCategorized = 0;
  let suggested = 0;
  let uncertain = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const categorizations = await callAI(systemPrompt, batch);

    // Build lookup for quick access
    const catMap = new Map(categorizations.map((c) => [c.transaction_id, c]));

    for (const txn of batch) {
      const cat = catMap.get(txn.id);
      if (!cat) {
        uncertain++;
        continue;
      }

      const account = accountByCode.get(cat.account_code);
      if (!account) {
        uncertain++;
        continue;
      }

      const autoThreshold =
        Math.abs(txn.amount) >= HIGH_AMOUNT_THRESHOLD
          ? HIGH_AMOUNT_AUTO_THRESHOLD
          : AI_CONFIDENCE_AUTO;

      // Resolve vendor
      const vendorId = cat.vendor_match
        ? vendorByName.get(cat.vendor_match.toLowerCase()) || null
        : null;

      if (cat.confidence >= autoThreshold) {
        // HIGH confidence: auto-categorize + create journal entry
        const bankGlId = bankGlMap.get(txn.plaid_bank_account_id);

        let journalEntryId: string | null = null;
        if (bankGlId) {
          journalEntryId = await createJournalEntryForTxn(
            admin,
            communityId,
            txn,
            account.id,
            bankGlId,
            vendorId,
          );
        }

        await admin
          .from('bank_transactions')
          .update({
            status: 'categorized',
            categorized_account_id: account.id,
            match_method: 'ai',
            ai_confidence: cat.confidence,
            ai_reasoning: cat.reasoning,
            vendor_id: vendorId,
            matched_journal_entry_id: journalEntryId,
          })
          .eq('id', txn.id);

        // Reinforce memory
        const normalized = normalizeTransactionName(txn.merchant_name || txn.name);
        if (normalized.length >= 3) {
          await admin.rpc('upsert_ai_memory', {
            p_normalized_name: normalized,
            p_account_code: cat.account_code,
            p_account_type: account.account_type,
          });
        }

        autoCategorized++;
      } else if (cat.confidence >= AI_CONFIDENCE_SUGGEST) {
        // MEDIUM confidence: store suggestion, keep pending
        await admin
          .from('bank_transactions')
          .update({
            categorized_account_id: account.id,
            ai_confidence: cat.confidence,
            ai_reasoning: cat.reasoning,
            vendor_id: vendorId,
          })
          .eq('id', txn.id);

        suggested++;
      } else {
        // LOW confidence: just store reasoning
        await admin
          .from('bank_transactions')
          .update({
            ai_confidence: cat.confidence,
            ai_reasoning: cat.reasoning,
          })
          .eq('id', txn.id);

        uncertain++;
      }
    }
  }

  return { auto_categorized: autoCategorized, suggested, uncertain };
}
