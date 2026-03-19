import { getPlaidClient } from '@/lib/plaid';
import { createAdminClient } from '@/lib/supabase/admin';
import { processStatementWithAI } from '@/lib/ai/process-statement';
import {
  batchApplyAICategorizationsInternal,
  processAndStoreCheckImagesInternal,
} from '@/lib/actions/ai-statement-actions';
import { extractCheckImagesFromPDF } from '@/lib/utils/extract-check-images';
import { reconcileChecksFromStatement } from '@/lib/utils/check-reconciliation';
import type { StatementFetchResult } from '@/lib/types/banking';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
