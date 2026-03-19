import { getAnthropicClient } from '@/lib/ai/anthropic';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AIStatementResults, AIExtractedTransaction, AIExtractedCheck } from '@/lib/types/banking';

const STATEMENT_SYSTEM_PROMPT = `You are an AI assistant for DuesIQ, an HOA management platform. You are processing a monthly bank statement PDF for a Homeowners Association.

Your job is to:
1. Extract ALL transactions from the statement (deposits, withdrawals, checks, fees, transfers)
2. For each CHECK transaction, extract check details (check number, payee, payer, amount, date, memo)
3. Identify the statement's ending balance

For each transaction, determine:
- date (YYYY-MM-DD format)
- description (the bank's description)
- amount in CENTS (positive = money leaving account/debit, negative = money entering account/credit)
- type: "check", "deposit", "withdrawal", "transfer", "fee", or "other"
- check_number if applicable (null otherwise)

For checks written BY the HOA (expenses), set is_vendor_check=true and try to identify the payee.
For checks written TO the HOA by homeowners (income), set is_homeowner_check=true and try to identify the payer from the check image.

IMPORTANT: For each check, include the 1-indexed "page_number" where the check image appears in the PDF. This is critical for extracting the check image. If the bank statement includes scanned check images, note which page they appear on.

Return your results as JSON matching this exact structure:
{
  "transactions": [
    {
      "date": "2026-01-15",
      "description": "CHECK #1234",
      "amount": 150000,
      "check_number": "1234",
      "type": "check",
      "payee_or_payer": "ABC Landscaping LLC",
      "suggested_category": "landscaping",
      "confidence": 0.95
    }
  ],
  "checks": [
    {
      "check_number": "1234",
      "payee": "ABC Landscaping LLC",
      "payer": "Westwood Community Six HOA",
      "amount": 150000,
      "date": "2026-01-15",
      "memo": "January lawn maintenance",
      "is_vendor_check": true,
      "is_homeowner_check": false,
      "page_number": 3,
      "matched_vendor_id": "uuid-if-matched",
      "matched_member_id": null,
      "matched_unit_id": null
    }
  ],
  "summary": {
    "total_deposits": 5000000,
    "total_withdrawals": 3500000,
    "ending_balance": 15000000
  }
}

All amounts should be in CENTS (e.g., $1,500.00 = 150000).
Be thorough. Extract every transaction. If you cannot read a check image clearly, still include it with your best guess and a lower confidence score.`;

interface ProcessStatementParams {
  communityId: string;
  statementUploadId: string;
  fileData: Buffer;
  mimeType: string;
}

export async function processStatementWithAI({
  communityId,
  statementUploadId,
  fileData,
  mimeType,
}: ProcessStatementParams): Promise<AIStatementResults> {
  const client = getAnthropicClient();
  const admin = createAdminClient();

  // Update status to processing
  await admin
    .from('statement_uploads')
    .update({ status: 'processing' })
    .eq('id', statementUploadId);

  try {
    // Fetch vendors and members for matching
    const [{ data: vendors }, { data: members }] = await Promise.all([
      admin
        .from('vendors')
        .select('id, name, company, vendor_categories(name)')
        .eq('community_id', communityId)
        .eq('status', 'active'),
      admin
        .from('members')
        .select('id, first_name, last_name, unit_id, units!inner(unit_number)')
        .eq('community_id', communityId),
    ]);

    const vendorContext = (vendors || [])
      .map((v) => {
        const catName = (v.vendor_categories as unknown as { name: string } | null)?.name ?? 'General';
        return `${v.name}${v.company ? ` (${v.company})` : ''} [${catName}] - ID: ${v.id}`;
      })
      .join('\n');

    const memberContext = (members || [])
      .map((m) => {
        const unit = m.units as unknown as { unit_number: string };
        return `${m.first_name} ${m.last_name} - Unit ${unit.unit_number} - ID: ${m.id}, Unit ID: ${m.unit_id}`;
      })
      .join('\n');

    const base64Data = fileData.toString('base64');

    // Use streaming for large PDFs to avoid timeouts
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 8192,
      system: STATEMENT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mimeType as 'application/pdf',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Process this bank statement. Here are the community's existing vendors and members for matching:

VENDORS:
${vendorContext || 'No vendors on file yet.'}

MEMBERS/HOMEOWNERS:
${memberContext || 'No members on file yet.'}

Extract all transactions, identify checks, and match payees/payers to the vendors and members listed above where possible. Include the vendor ID or member ID in your response if you find a match.

Return ONLY valid JSON, no markdown code fences.`,
            },
          ],
        },
      ],
    });

    const response = await stream.finalMessage();
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse AI response
    const rawText = textBlock.text.trim();
    // Handle potential markdown code fences
    const jsonText = rawText.startsWith('{') ? rawText : rawText.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonText);

    // Map to our types
    const transactions: AIExtractedTransaction[] = (parsed.transactions || []).map(
      (t: Record<string, unknown>) => ({
        date: t.date as string,
        description: t.description as string,
        amount: t.amount as number,
        check_number: (t.check_number as string) || null,
        type: (t.type as string) || 'other',
        matched_vendor_id: (t.matched_vendor_id as string) || null,
        matched_vendor_name: (t.payee_or_payer as string) || null,
        matched_member_id: (t.matched_member_id as string) || null,
        matched_member_name: (t.payee_or_payer as string) || null,
        suggested_account_code: mapCategoryToAccountCode(t.suggested_category as string),
        confidence: (t.confidence as number) || 0.5,
        bank_txn_id: null,
      }),
    );

    const checks: AIExtractedCheck[] = (parsed.checks || []).map(
      (c: Record<string, unknown>) => ({
        check_number: c.check_number as string,
        payee: c.payee as string,
        payer: c.payer as string,
        amount: c.amount as number,
        date: c.date as string,
        memo: (c.memo as string) || null,
        image_path: null,
        is_vendor_check: !!(c.is_vendor_check as boolean),
        is_homeowner_check: !!(c.is_homeowner_check as boolean),
        matched_vendor_id: (c.matched_vendor_id as string) || null,
        matched_member_id: (c.matched_member_id as string) || null,
        matched_unit_id: (c.matched_unit_id as string) || null,
        document_saved: false,
        page_number: (c.page_number as number) || undefined,
      }),
    );

    // Match vendors by name fuzzy matching if AI didn't provide IDs
    for (const txn of transactions) {
      if (!txn.matched_vendor_id && txn.matched_vendor_name && vendors) {
        const match = findVendorMatch(txn.matched_vendor_name, vendors);
        if (match) {
          txn.matched_vendor_id = match.id;
          txn.matched_vendor_name = match.name;
        }
      }
    }

    for (const check of checks) {
      if (check.is_vendor_check && !check.matched_vendor_id && check.payee && vendors) {
        const match = findVendorMatch(check.payee, vendors);
        if (match) {
          check.matched_vendor_id = match.id;
        }
      }
      if (check.is_homeowner_check && !check.matched_member_id && check.payer && members) {
        const match = findMemberMatch(check.payer, members);
        if (match) {
          check.matched_member_id = match.id;
          check.matched_unit_id = match.unit_id;
        }
      }
    }

    const results: AIStatementResults = {
      transactions,
      checks,
      summary: {
        total_deposits: parsed.summary?.total_deposits || 0,
        total_withdrawals: parsed.summary?.total_withdrawals || 0,
        ending_balance: parsed.summary?.ending_balance || null,
      },
    };

    // Update statement upload with results
    await admin
      .from('statement_uploads')
      .update({
        status: 'completed',
        ai_results: results as unknown as Record<string, unknown>,
        transactions_found: transactions.length,
        checks_found: checks.length,
        auto_categorized: transactions.filter((t) => t.matched_vendor_id).length,
        processed_at: new Date().toISOString(),
      })
      .eq('id', statementUploadId);

    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await admin
      .from('statement_uploads')
      .update({
        status: 'failed',
        error_message: message,
      })
      .eq('id', statementUploadId);
    throw error;
  }
}

function mapCategoryToAccountCode(category: string | null): string | null {
  if (!category) return null;
  const map: Record<string, string> = {
    landscaping: '5100',
    maintenance: '5000',
    insurance: '5200',
    utilities: '5300',
    management: '5400',
    legal: '5500',
    administrative: '5600',
    processing_fees: '5700',
    general: '5000',
  };
  return map[category] || null;
}

function findVendorMatch(
  name: string,
  vendors: { id: string; name: string; company: string | null }[],
): { id: string; name: string } | null {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const v of vendors) {
    const vName = v.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const vCompany = (v.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.includes(vName) || vName.includes(normalized)) return { id: v.id, name: v.name };
    if (vCompany && (normalized.includes(vCompany) || vCompany.includes(normalized)))
      return { id: v.id, name: v.name };
  }
  return null;
}

function findMemberMatch(
  name: string,
  members: { id: string; first_name: string; last_name: string; unit_id: string }[],
): { id: string; unit_id: string } | null {
  const normalized = name.toLowerCase().replace(/[^a-z ]/g, '');
  for (const m of members) {
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    const lastName = m.last_name.toLowerCase();
    if (normalized.includes(fullName) || fullName.includes(normalized)) return { id: m.id, unit_id: m.unit_id };
    if (normalized.includes(lastName) && lastName.length > 3) return { id: m.id, unit_id: m.unit_id };
  }
  return null;
}
