import { getPlaidClient } from '@/lib/plaid';
import { createAdminClient } from '@/lib/supabase/admin';
import { processStatementWithAI } from '@/lib/ai/process-statement';
import {
  batchApplyAICategorizationsInternal,
  processAndStoreCheckImagesInternal,
} from '@/lib/actions/ai-statement-actions';
import { extractCheckImagesFromPDF } from '@/lib/utils/extract-check-images';
import { reconcileChecksFromStatement } from '@/lib/utils/check-reconciliation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StatementFetchResult } from '@/lib/types/banking';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Year folder helpers ──────────────────────────────────────────

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Find or create the "Financial > {year} Financials" subfolder.
 * Also pre-creates next year's folder if current month is October or later.
 */
async function getOrCreateYearFolder(
  admin: SupabaseClient,
  communityId: string,
  year: number,
): Promise<string | null> {
  // Find the "Financial" root folder
  const { data: financialFolder } = await admin
    .from('document_folders')
    .select('id')
    .eq('community_id', communityId)
    .eq('name', 'Financial')
    .is('parent_id', null)
    .single();

  if (!financialFolder) return null;

  const folderName = `${year} Financials`;

  // Check if year folder already exists
  const { data: existing } = await admin
    .from('document_folders')
    .select('id')
    .eq('community_id', communityId)
    .eq('parent_id', financialFolder.id)
    .eq('name', folderName)
    .maybeSingle();

  if (existing) return existing.id;

  // Create it
  const { data: created } = await admin
    .from('document_folders')
    .insert({
      community_id: communityId,
      name: folderName,
      parent_id: financialFolder.id,
      sort_order: year, // Natural sort by year
    })
    .select('id')
    .single();

  return created?.id || null;
}

/**
 * Save a statement PDF as a document in "Financial > {year} Financials".
 * Also pre-creates next year's folder if we're in October or later.
 */
async function saveStatementToDocuments(
  admin: SupabaseClient,
  communityId: string,
  storagePath: string,
  fileSize: number,
  year: number,
  month: number,
): Promise<void> {
  const folderId = await getOrCreateYearFolder(admin, communityId, year);
  if (!folderId) {
    console.error('Could not find or create year folder for statements');
    return;
  }

  const monthName = MONTH_NAMES[month] || `Month ${month}`;
  const title = `Bank Statement - ${monthName} ${year}`;

  // Check for duplicate (same title + folder)
  const { data: existingDoc } = await admin
    .from('documents')
    .select('id')
    .eq('community_id', communityId)
    .eq('folder_id', folderId)
    .eq('title', title)
    .maybeSingle();

  if (existingDoc) return; // Already saved

  await admin.from('documents').insert({
    community_id: communityId,
    title,
    category: 'financial',
    folder_id: folderId,
    file_path: storagePath,
    file_size: fileSize,
    is_public: false,
    visibility: 'private',
  });

  // Pre-create next year's folder if October or later
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  if (currentMonth >= 10) {
    const nextYear = new Date().getFullYear() + 1;
    await getOrCreateYearFolder(admin, communityId, nextYear);
  }
}

/**
 * Fetch available bank statements from Plaid, download new ones,
 * process them with AI, and auto-apply categorizations.
 */
export async function fetchAndProcessStatements(
  communityId: string,
  connectionId: string,
): Promise<StatementFetchResult> {
  const admin = createAdminClient();
  const result: StatementFetchResult = {
    processed: 0,
    skipped: 0,
    already_exists: 0,
    errors: [],
  };

  // Load connection
  const { data: connection } = await admin
    .from('plaid_connections')
    .select('plaid_access_token, has_statements_consent, is_active')
    .eq('id', connectionId)
    .eq('community_id', communityId)
    .single();

  if (!connection) {
    result.errors.push('Connection not found');
    return result;
  }

  if (!connection.is_active) {
    result.errors.push('Connection is inactive');
    return result;
  }

  if (!connection.has_statements_consent) {
    result.skipped = 1;
    return result;
  }

  // Build map of plaid_account_id -> local bank account ID
  const { data: bankAccounts } = await admin
    .from('plaid_bank_accounts')
    .select('id, plaid_account_id')
    .eq('plaid_connection_id', connectionId)
    .eq('is_active', true);

  const accountMap = new Map(
    (bankAccounts || []).map((a) => [a.plaid_account_id, a.id]),
  );

  const plaid = getPlaidClient();

  // List available statements
  let statementsData;
  try {
    const response = await plaid.statementsList({
      access_token: connection.plaid_access_token,
    });
    statementsData = response.data;
  } catch (err: unknown) {
    const plaidErr = err as { response?: { data?: { error_code?: string } } };
    const errorCode = plaidErr?.response?.data?.error_code;

    if (errorCode === 'ITEM_LOGIN_REQUIRED' || errorCode === 'INVALID_ACCESS_TOKEN') {
      await admin
        .from('plaid_connections')
        .update({ error_code: errorCode })
        .eq('id', connectionId);
      result.errors.push(`Plaid auth error: ${errorCode}`);
      return result;
    }

    if (errorCode === 'PRODUCTS_NOT_SUPPORTED' || errorCode === 'NO_ACCOUNTS') {
      // Bank doesn't support statements or no accounts
      await admin
        .from('plaid_connections')
        .update({ has_statements_consent: false })
        .eq('id', connectionId);
      result.errors.push(`Statements not available: ${errorCode}`);
      return result;
    }

    result.errors.push(`Failed to list statements: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  // Get already-processed plaid_statement_ids for this community
  const { data: existingUploads } = await admin
    .from('statement_uploads')
    .select('plaid_statement_id')
    .eq('community_id', communityId)
    .not('plaid_statement_id', 'is', null);

  const processedIds = new Set(
    (existingUploads || []).map((u) => u.plaid_statement_id),
  );

  // Process each account's statements
  for (const account of statementsData.accounts || []) {
    const localBankAccountId = accountMap.get(account.account_id);

    for (const stmt of account.statements || []) {
      const stmtId = stmt.statement_id;

      if (processedIds.has(stmtId)) {
        result.already_exists++;
        continue;
      }

      try {
        // Download PDF
        const downloadResponse = await plaid.statementsDownload(
          { access_token: connection.plaid_access_token, statement_id: stmtId },
          { responseType: 'arraybuffer' },
        );

        const pdfBuffer = Buffer.from(downloadResponse.data as unknown as ArrayBuffer);

        // Upload to Supabase Storage
        const month = String(stmt.month).padStart(2, '0');
        const storagePath = `${communityId}/statements/plaid_${stmt.year}-${month}_${stmtId}.pdf`;

        await admin.storage
          .from('hoa-documents')
          .upload(storagePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false,
          });

        // Create statement_uploads record
        const { data: upload } = await admin
          .from('statement_uploads')
          .insert({
            community_id: communityId,
            plaid_bank_account_id: localBankAccountId || null,
            file_path: storagePath,
            file_name: `plaid_${stmt.year}-${month}.pdf`,
            file_size: pdfBuffer.length,
            period_month: stmt.month,
            period_year: stmt.year,
            source: 'plaid',
            plaid_statement_id: stmtId,
            plaid_connection_id: connectionId,
          })
          .select()
          .single();

        if (!upload) {
          result.errors.push(`Failed to create upload record for ${stmtId}`);
          continue;
        }

        // Save statement PDF to Financial > {year} Financials documents folder
        try {
          await saveStatementToDocuments(
            admin, communityId, storagePath, pdfBuffer.length, stmt.year, stmt.month,
          );
        } catch (docErr) {
          console.error('Failed to save statement to documents (non-fatal):', docErr);
        }

        // Process with AI
        const aiResults = await processStatementWithAI({
          communityId,
          statementUploadId: upload.id,
          fileData: pdfBuffer,
          mimeType: 'application/pdf',
        });

        // Extract check images from the PDF and store them
        if (aiResults.checks.length > 0) {
          try {
            const extractedImages = await extractCheckImagesFromPDF(pdfBuffer, aiResults.checks);

            // Build map of check_number -> image buffer
            const imageMap = new Map<string, Buffer>();
            for (const img of extractedImages) {
              imageMap.set(img.checkNumber, img.imageData);
            }

            // Store check images to vendor/household documents
            await processAndStoreCheckImagesInternal(admin, communityId, aiResults.checks, imageMap);

            // Reconcile checks: match to bank transactions + auto-categorize
            await reconcileChecksFromStatement(admin, communityId, aiResults.checks);
          } catch (checkErr) {
            console.error('Check image extraction/reconciliation failed (non-fatal):', checkErr);
          }
        }

        // Auto-apply categorizations for non-check transactions
        await batchApplyAICategorizationsInternal(admin, communityId, upload.id);

        result.processed++;
      } catch (err) {
        result.errors.push(
          `Statement ${stmtId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Rate limit delay between downloads
      await sleep(300);
    }
  }

  // Update last fetched timestamp
  await admin
    .from('plaid_connections')
    .update({ statements_last_fetched_at: new Date().toISOString() })
    .eq('id', connectionId);

  return result;
}
