'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIExtractedCheck, AIExtractedTransaction } from '@/lib/types/banking';
import { requirePermission } from '@/lib/actions/auth-guard';

// ─── Internal helpers (no auth check, accepts admin client) ──────

/**
 * Internal: apply a single AI categorization to a bank transaction.
 */
export async function applyAICategorizationInternal(
  admin: SupabaseClient,
  communityId: string,
  bankTxnId: string,
  aiTxn: AIExtractedTransaction,
) {
  const updateData: Record<string, unknown> = {
    status: 'categorized',
    match_method: 'rule',
  };

  if (aiTxn.matched_vendor_id) {
    updateData.vendor_id = aiTxn.matched_vendor_id;
  }

  if (aiTxn.suggested_account_code) {
    const { data: account } = await admin
      .from('accounts')
      .select('id')
      .eq('community_id', communityId)
      .eq('code', aiTxn.suggested_account_code)
      .single();

    if (account) {
      updateData.categorized_account_id = account.id;
    }
  }

  await admin
    .from('bank_transactions')
    .update(updateData)
    .eq('id', bankTxnId)
    .eq('community_id', communityId);

  return { success: true };
}

/**
 * Internal: batch apply AI categorizations without auth check.
 * Used by both the server action (with auth) and the automated Plaid flow (admin-only).
 */
export async function batchApplyAICategorizationsInternal(
  admin: SupabaseClient,
  communityId: string,
  statementUploadId: string,
) {
  const { data: upload } = await admin
    .from('statement_uploads')
    .select('ai_results')
    .eq('id', statementUploadId)
    .eq('community_id', communityId)
    .single();

  if (!upload?.ai_results) {
    return { applied: 0, skipped: 0 };
  }

  const results = upload.ai_results as unknown as { transactions: AIExtractedTransaction[] };
  const aiTransactions = results.transactions || [];

  const { data: pendingTxns } = await admin
    .from('bank_transactions')
    .select('id, date, amount, name, merchant_name')
    .eq('community_id', communityId)
    .eq('status', 'pending');

  if (!pendingTxns || pendingTxns.length === 0) {
    return { applied: 0, skipped: aiTransactions.length };
  }

  let applied = 0;
  let skipped = 0;

  for (const aiTxn of aiTransactions) {
    if (!aiTxn.matched_vendor_id && !aiTxn.suggested_account_code) {
      skipped++;
      continue;
    }

    const match = pendingTxns.find(
      (bt) => bt.amount === aiTxn.amount && bt.date === aiTxn.date,
    );

    if (match) {
      await applyAICategorizationInternal(admin, communityId, match.id, aiTxn);
      const idx = pendingTxns.indexOf(match);
      pendingTxns.splice(idx, 1);
      applied++;
    } else {
      skipped++;
    }
  }

  await admin
    .from('statement_uploads')
    .update({ auto_categorized: applied })
    .eq('id', statementUploadId);

  return { applied, skipped };
}

// ─── Server actions (with auth check) ────────────────────────────

/**
 * Apply AI-extracted transaction data to an existing uncategorized bank transaction.
 */
export async function applyAICategorizationToTransaction(
  communityId: string,
  bankTxnId: string,
  aiTxn: AIExtractedTransaction,
) {
  await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();
  return applyAICategorizationInternal(admin, communityId, bankTxnId, aiTxn);
}

/**
 * Batch apply AI categorizations to all matching uncategorized bank transactions.
 */
export async function batchApplyAICategorizations(
  communityId: string,
  statementUploadId: string,
) {
  await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();
  return batchApplyAICategorizationsInternal(admin, communityId, statementUploadId);
}

/**
 * Internal: save a check image as a vendor document without auth check.
 * Used by the automated Plaid statement pipeline.
 */
export async function saveCheckImageToVendorInternal(
  admin: SupabaseClient,
  communityId: string,
  vendorId: string,
  checkNumber: string,
  checkDate: string,
  imageData: Buffer,
  mimeType: string,
) {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const storagePath = `${communityId}/vendor-docs/${vendorId}/check_${checkNumber}_${checkDate}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from('hoa-documents')
    .upload(storagePath, imageData, { contentType: mimeType, upsert: true });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  await admin.from('vendor_documents').insert({
    vendor_id: vendorId,
    community_id: communityId,
    document_type: 'check_image',
    title: `Check #${checkNumber} - ${checkDate}`,
    file_path: storagePath,
    file_size: imageData.length,
  });

  return { success: true, path: storagePath };
}

/**
 * Internal: save a check image as a household document without auth check.
 * Used by the automated Plaid statement pipeline.
 */
export async function saveCheckImageToHouseholdInternal(
  admin: SupabaseClient,
  communityId: string,
  unitId: string,
  checkNumber: string,
  checkDate: string,
  payerName: string,
  imageData: Buffer,
  mimeType: string,
) {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const storagePath = `${communityId}/household-docs/${unitId}/check_${checkNumber}_${checkDate}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from('hoa-documents')
    .upload(storagePath, imageData, { contentType: mimeType, upsert: true });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  await admin.from('household_documents').insert({
    community_id: communityId,
    unit_id: unitId,
    title: `Check #${checkNumber} from ${payerName} - ${checkDate}`,
    file_type: 'check_image',
    file_path: storagePath,
  });

  return { success: true, path: storagePath };
}

/**
 * Internal: process and store check images extracted from a statement PDF.
 * Saves each check image to the appropriate vendor or household documents.
 */
export async function processAndStoreCheckImagesInternal(
  admin: SupabaseClient,
  communityId: string,
  checks: AIExtractedCheck[],
  extractedImages: Map<string, Buffer>,
): Promise<{ vendor_docs_saved: number; household_docs_saved: number; skipped: number }> {
  const results = { vendor_docs_saved: 0, household_docs_saved: 0, skipped: 0 };

  for (const check of checks) {
    const imageBuffer = extractedImages.get(check.check_number);
    if (!imageBuffer) {
      results.skipped++;
      continue;
    }

    try {
      // Upload to temporary storage path
      const storagePath = `${communityId}/check-images/check_${check.check_number}_${check.date}.png`;
      await admin.storage
        .from('hoa-documents')
        .upload(storagePath, imageBuffer, { contentType: 'image/png', upsert: true });

      check.image_path = storagePath;

      if (check.is_vendor_check && check.matched_vendor_id) {
        await saveCheckImageToVendorInternal(
          admin, communityId, check.matched_vendor_id,
          check.check_number, check.date, imageBuffer, 'image/png',
        );
        check.document_saved = true;
        results.vendor_docs_saved++;
      } else if (check.is_homeowner_check && check.matched_unit_id) {
        await saveCheckImageToHouseholdInternal(
          admin, communityId, check.matched_unit_id,
          check.check_number, check.date, check.payer, imageBuffer, 'image/png',
        );
        check.document_saved = true;
        results.household_docs_saved++;
      } else {
        results.skipped++;
      }
    } catch (err) {
      console.error(`Failed to save check #${check.check_number} image:`, err);
      results.skipped++;
    }
  }

  return results;
}

/**
 * Save a check image as a document on the vendor's account.
 */
export async function saveCheckImageToVendor(
  communityId: string,
  vendorId: string,
  checkNumber: string,
  checkDate: string,
  imageData: Buffer,
  mimeType: string,
) {
  const { member } = await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const storagePath = `${communityId}/vendor-docs/${vendorId}/check_${checkNumber}_${checkDate}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from('hoa-documents')
    .upload(storagePath, imageData, { contentType: mimeType, upsert: true });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Create vendor document record
  await admin.from('vendor_documents').insert({
    vendor_id: vendorId,
    community_id: communityId,
    document_type: 'other',
    title: `Check #${checkNumber} - ${checkDate}`,
    file_path: storagePath,
    file_size: imageData.length,
    uploaded_by: member.id,
  });

  return { success: true, path: storagePath };
}

/**
 * Save a check image as a document on a household/unit.
 */
export async function saveCheckImageToHousehold(
  communityId: string,
  unitId: string,
  checkNumber: string,
  checkDate: string,
  payerName: string,
  imageData: Buffer,
  mimeType: string,
) {
  await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const storagePath = `${communityId}/household-docs/${unitId}/check_${checkNumber}_${checkDate}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from('hoa-documents')
    .upload(storagePath, imageData, { contentType: mimeType, upsert: true });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Create a general document record linked to the community
  await admin.from('documents').insert({
    community_id: communityId,
    title: `Check #${checkNumber} from ${payerName} - ${checkDate}`,
    category: 'financial',
    file_path: storagePath,
    file_size: imageData.length,
    is_public: false,
    uploaded_by: unitId, // Using unit_id as reference
  });

  return { success: true, path: storagePath };
}

/**
 * Process all AI-extracted checks: save images to vendor/household accounts.
 */
export async function processAIChecks(
  communityId: string,
  checks: AIExtractedCheck[],
) {
  await requirePermission(communityId, 'banking', 'write');

  const results = {
    vendor_docs_saved: 0,
    household_docs_saved: 0,
    skipped: 0,
  };

  for (const check of checks) {
    // Skip if no image path (image wasn't extracted/cropped)
    if (!check.image_path) {
      results.skipped++;
      continue;
    }

    // Download the check image from storage
    const admin = createAdminClient();
    const { data: imageBlob } = await admin.storage
      .from('hoa-documents')
      .download(check.image_path);

    if (!imageBlob) {
      results.skipped++;
      continue;
    }

    const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

    if (check.is_vendor_check && check.matched_vendor_id) {
      await saveCheckImageToVendor(
        communityId,
        check.matched_vendor_id,
        check.check_number,
        check.date,
        imageBuffer,
        'image/png',
      );
      results.vendor_docs_saved++;
    } else if (check.is_homeowner_check && check.matched_unit_id) {
      await saveCheckImageToHousehold(
        communityId,
        check.matched_unit_id,
        check.check_number,
        check.date,
        check.payer,
        imageBuffer,
        'image/png',
      );
      results.household_docs_saved++;
    } else {
      results.skipped++;
    }
  }

  return results;
}

/**
 * Get all statement uploads for a community.
 */
export async function getStatementUploads(communityId: string) {
  await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('statement_uploads')
    .select('*')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}
