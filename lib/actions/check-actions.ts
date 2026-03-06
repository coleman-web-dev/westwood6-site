'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createJournalEntry, reverseJournalEntry } from '@/lib/utils/accounting-entries';
import { queueEmail } from '@/lib/email/queue';
import type { CheckSettings, CheckWithDetails } from '@/lib/types/check';
import { requirePermission } from '@/lib/actions/auth-guard';

/** Get check settings from community theme */
export async function getCheckSettings(communityId: string): Promise<CheckSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('communities')
    .select('theme')
    .eq('id', communityId)
    .single();

  const theme = data?.theme as Record<string, unknown> | null;
  const settings = theme?.check_settings as CheckSettings | undefined;

  return settings || {
    signatures_required: 1,
    designated_signers: [],
    auto_approve_under: null,
  };
}

/** Update check settings in community theme */
export async function updateCheckSettings(communityId: string, settings: CheckSettings) {
  try {
    await requirePermission(communityId, 'checks', 'read');
    const admin = createAdminClient();

    const { data: community } = await admin
      .from('communities')
      .select('theme')
      .eq('id', communityId)
      .single();

    const currentTheme = (community?.theme || {}) as Record<string, unknown>;
    const updatedTheme = { ...currentTheme, check_settings: settings };

    await admin
      .from('communities')
      .update({ theme: updatedTheme })
      .eq('id', communityId);

    return { success: true };
  } catch (error) {
    console.error('Failed to update check settings:', error);
    return { success: false, error: 'Failed to update settings' };
  }
}

/** Create a check number sequence */
export async function createCheckSequence(params: {
  communityId: string;
  bankAccountLabel: string;
  plaidBankAccountId?: string;
  startingNumber?: number;
  prefix?: string;
}) {
  try {
    await requirePermission(params.communityId, 'checks', 'write');
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('check_number_sequences')
      .insert({
        community_id: params.communityId,
        plaid_bank_account_id: params.plaidBankAccountId || null,
        bank_account_label: params.bankAccountLabel,
        next_check_number: params.startingNumber || 1001,
        prefix: params.prefix || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, sequence: data };
  } catch (error) {
    console.error('Failed to create check sequence:', error);
    return { success: false, error: 'Failed to create sequence' };
  }
}

/** Update a check number sequence */
export async function updateCheckSequence(params: {
  communityId: string;
  sequenceId: string;
  nextCheckNumber?: number;
  prefix?: string;
  bankAccountLabel?: string;
}) {
  try {
    await requirePermission(params.communityId, 'checks', 'write');
    const admin = createAdminClient();

    const updates: Record<string, unknown> = {};
    if (params.nextCheckNumber !== undefined) updates.next_check_number = params.nextCheckNumber;
    if (params.prefix !== undefined) updates.prefix = params.prefix;
    if (params.bankAccountLabel !== undefined) updates.bank_account_label = params.bankAccountLabel;

    await admin
      .from('check_number_sequences')
      .update(updates)
      .eq('id', params.sequenceId)
      .eq('community_id', params.communityId);

    return { success: true };
  } catch (error) {
    console.error('Failed to update check sequence:', error);
    return { success: false, error: 'Failed to update sequence' };
  }
}

/** Get all check sequences for a community */
export async function getCheckSequences(communityId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('check_number_sequences')
    .select('*')
    .eq('community_id', communityId)
    .order('created_at');

  return data || [];
}

/** Create a check, assign number, handle approval flow */
export async function createCheck(params: {
  communityId: string;
  payeeVendorId: string | null;
  payeeName: string;
  amount: number; // cents
  date: string;
  memo: string;
  expenseAccountId: string;
  bankAccountId: string;
  checkSequenceId: string;
}) {
  try {
    const { user } = await requirePermission(params.communityId, 'checks', 'write');
    const admin = createAdminClient();

    // Atomically get next check number
    const { data: checkNum, error: numError } = await admin.rpc('get_next_check_number', {
      p_sequence_id: params.checkSequenceId,
    });

    if (numError || checkNum === null) {
      return { success: false, error: 'Failed to assign check number' };
    }

    // Get check settings to determine approval requirements
    const settings = await getCheckSettings(params.communityId);
    const needsApproval =
      settings.signatures_required > 1 ||
      (settings.signatures_required === 1 &&
        settings.designated_signers.length > 0 &&
        settings.auto_approve_under !== null &&
        params.amount >= settings.auto_approve_under);

    // If only 1 signer required and no auto_approve threshold, or amount is under threshold, auto-approve
    const autoApprove =
      settings.signatures_required <= 1 &&
      (settings.auto_approve_under === null || params.amount < settings.auto_approve_under);

    const status = autoApprove ? 'approved' : needsApproval ? 'pending_approval' : 'approved';

    const { data: check, error: checkError } = await admin
      .from('checks')
      .insert({
        community_id: params.communityId,
        check_number: checkNum,
        check_sequence_id: params.checkSequenceId,
        date: params.date,
        amount: params.amount,
        payee_vendor_id: params.payeeVendorId,
        payee_name: params.payeeName,
        memo: params.memo || null,
        expense_account_id: params.expenseAccountId,
        bank_account_id: params.bankAccountId,
        status,
        created_by: user.id,
      })
      .select()
      .single();

    if (checkError || !check) {
      return { success: false, error: checkError?.message || 'Failed to create check' };
    }

    // If needs approval, create approval records and send emails
    if (status === 'pending_approval' && settings.designated_signers.length > 0) {
      // Find which signers need to approve (excluding the creator if they're a signer)
      const { data: creatorMember } = await admin
        .from('members')
        .select('id')
        .eq('user_id', user.id)
        .eq('community_id', params.communityId)
        .single();

      const otherSigners = settings.designated_signers.filter(
        (s) => s !== creatorMember?.id,
      );

      // If creator is a designated signer, auto-approve their part
      if (creatorMember && settings.designated_signers.includes(creatorMember.id)) {
        // Get creator's signature
        const { data: creatorSig } = await admin
          .from('check_signatures')
          .select('id')
          .eq('member_id', creatorMember.id)
          .eq('community_id', params.communityId)
          .eq('is_active', true)
          .single();

        await admin.from('check_approvals').insert({
          check_id: check.id,
          signer_member_id: creatorMember.id,
          status: 'approved',
          signature_id: creatorSig?.id || null,
          approved_at: new Date().toISOString(),
        });
      }

      // Create pending approvals for other signers
      if (otherSigners.length > 0) {
        const approvalInserts = otherSigners.map((signerId) => ({
          check_id: check.id,
          signer_member_id: signerId,
          status: 'pending',
        }));

        await admin.from('check_approvals').insert(approvalInserts);

        // Send approval request emails
        const { data: signerMembers } = await admin
          .from('members')
          .select('id, name, email')
          .in('id', otherSigners);

        const { data: community } = await admin
          .from('communities')
          .select('name, slug')
          .eq('id', params.communityId)
          .single();

        for (const signer of signerMembers || []) {
          if (signer.email) {
            await queueEmail({
              communityId: params.communityId,
              recipientMemberId: signer.id,
              recipientEmail: signer.email,
              recipientName: signer.name || undefined,
              category: 'system',
              priority: 'immediate',
              subject: `Check #${checkNum} requires your approval`,
              templateId: 'check-approval',
              templateData: {
                signerName: signer.name || 'Board Member',
                checkNumber: checkNum,
                payeeName: params.payeeName,
                amount: params.amount,
                memo: params.memo || '',
                date: params.date,
                communityName: community?.name || '',
                reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${community?.slug}/dashboard?tab=accounting&check=${check.id}`,
              },
            });
          }
        }
      }

      // Check if we already have enough approvals
      const { count: approvedCount } = await admin
        .from('check_approvals')
        .select('id', { count: 'exact', head: true })
        .eq('check_id', check.id)
        .eq('status', 'approved');

      if (approvedCount && approvedCount >= settings.signatures_required) {
        await admin
          .from('checks')
          .update({ status: 'approved' })
          .eq('id', check.id);
      }
    }

    return { success: true, check };
  } catch (error) {
    console.error('Failed to create check:', error);
    return { success: false, error: 'Failed to create check' };
  }
}

/** Approve a check (as a designated signer) */
export async function approveCheck(communityId: string, checkId: string) {
  try {
    const { member } = await requirePermission(communityId, 'checks', 'write');
    const admin = createAdminClient();

    // Get the signer's signature
    const { data: signature } = await admin
      .from('check_signatures')
      .select('id')
      .eq('member_id', member.id)
      .eq('community_id', communityId)
      .eq('is_active', true)
      .single();

    // Update or create the approval record
    const { data: existing } = await admin
      .from('check_approvals')
      .select('id')
      .eq('check_id', checkId)
      .eq('signer_member_id', member.id)
      .single();

    if (existing) {
      await admin
        .from('check_approvals')
        .update({
          status: 'approved',
          signature_id: signature?.id || null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await admin.from('check_approvals').insert({
        check_id: checkId,
        signer_member_id: member.id,
        status: 'approved',
        signature_id: signature?.id || null,
        approved_at: new Date().toISOString(),
      });
    }

    // Check if all required approvals are met
    const settings = await getCheckSettings(communityId);
    const { count: approvedCount } = await admin
      .from('check_approvals')
      .select('id', { count: 'exact', head: true })
      .eq('check_id', checkId)
      .eq('status', 'approved');

    if (approvedCount && approvedCount >= settings.signatures_required) {
      await admin
        .from('checks')
        .update({ status: 'approved' })
        .eq('id', checkId)
        .eq('community_id', communityId);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to approve check:', error);
    return { success: false, error: 'Failed to approve check' };
  }
}

/** Reject a check */
export async function rejectCheck(communityId: string, checkId: string, reason: string) {
  try {
    const { member } = await requirePermission(communityId, 'checks', 'write');
    const admin = createAdminClient();

    // Update approval record
    const { data: existing } = await admin
      .from('check_approvals')
      .select('id')
      .eq('check_id', checkId)
      .eq('signer_member_id', member.id)
      .single();

    if (existing) {
      await admin
        .from('check_approvals')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', existing.id);
    }

    // Mark check as draft (rejected)
    await admin
      .from('checks')
      .update({ status: 'draft' })
      .eq('id', checkId)
      .eq('community_id', communityId);

    return { success: true };
  } catch (error) {
    console.error('Failed to reject check:', error);
    return { success: false, error: 'Failed to reject check' };
  }
}

/** Print a check and create journal entry */
export async function printCheck(communityId: string, checkId: string) {
  try {
    const { user } = await requirePermission(communityId, 'checks', 'write');
    const admin = createAdminClient();

    // Get check with account details
    const { data: check } = await admin
      .from('checks')
      .select('*, expense_account:accounts!checks_expense_account_id_fkey(code, name), bank_account:accounts!checks_bank_account_id_fkey(code, name)')
      .eq('id', checkId)
      .eq('community_id', communityId)
      .single();

    if (!check) return { success: false, error: 'Check not found' };
    if (check.status !== 'approved' && check.status !== 'draft') {
      return { success: false, error: 'Check must be approved before printing' };
    }

    // Create journal entry: DR Expense, CR Bank Cash
    const expenseAccount = check.expense_account as unknown as { code: string; name: string };
    const bankAccount = check.bank_account as unknown as { code: string; name: string };

    const journalEntryId = await createJournalEntry({
      communityId,
      entryDate: check.date,
      description: `Check #${check.check_number} to ${check.payee_name}`,
      source: 'check_payment',
      referenceType: 'check',
      referenceId: check.id,
      vendorId: check.payee_vendor_id || undefined,
      createdBy: user.id,
      memo: check.memo || undefined,
      lines: [
        { accountCode: expenseAccount.code, debit: check.amount, credit: 0, description: expenseAccount.name },
        { accountCode: bankAccount.code, debit: 0, credit: check.amount, description: bankAccount.name },
      ],
    });

    // Update check status
    await admin
      .from('checks')
      .update({
        status: 'printed',
        printed_at: new Date().toISOString(),
        journal_entry_id: journalEntryId,
      })
      .eq('id', checkId);

    return { success: true, journalEntryId };
  } catch (error) {
    console.error('Failed to print check:', error);
    return { success: false, error: 'Failed to print check' };
  }
}

/** Void a check, reverse journal entry if exists */
export async function voidCheck(communityId: string, checkId: string, reason: string) {
  try {
    const { user } = await requirePermission(communityId, 'checks', 'write');
    const admin = createAdminClient();

    const { data: check } = await admin
      .from('checks')
      .select('journal_entry_id, status')
      .eq('id', checkId)
      .eq('community_id', communityId)
      .single();

    if (!check) return { success: false, error: 'Check not found' };
    if (check.status === 'voided') return { success: false, error: 'Check already voided' };
    if (check.status === 'cleared') return { success: false, error: 'Cannot void a cleared check' };

    // Reverse journal entry if exists
    if (check.journal_entry_id) {
      await reverseJournalEntry(communityId, check.journal_entry_id, `Check voided: ${reason}`);
    }

    await admin
      .from('checks')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        voided_by: user.id,
        void_reason: reason,
      })
      .eq('id', checkId);

    return { success: true };
  } catch (error) {
    console.error('Failed to void check:', error);
    return { success: false, error: 'Failed to void check' };
  }
}

/** Upload a signature image for a board member */
export async function uploadSignature(
  communityId: string,
  memberId: string,
  filePath: string,
) {
  try {
    await requirePermission(communityId, 'checks', 'read');
    const admin = createAdminClient();

    // Upsert signature record
    const { error } = await admin
      .from('check_signatures')
      .upsert(
        {
          community_id: communityId,
          member_id: memberId,
          file_path: filePath,
          is_active: true,
        },
        { onConflict: 'community_id,member_id' },
      );

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('Failed to save signature:', error);
    return { success: false, error: 'Failed to save signature' };
  }
}

/** Delete a board member's signature */
export async function deleteSignature(communityId: string, memberId: string) {
  try {
    await requirePermission(communityId, 'checks', 'read');
    const admin = createAdminClient();

    // Get the file path first
    const { data: sig } = await admin
      .from('check_signatures')
      .select('file_path')
      .eq('community_id', communityId)
      .eq('member_id', memberId)
      .single();

    if (sig?.file_path) {
      await admin.storage.from('hoa-documents').remove([sig.file_path]);
    }

    await admin
      .from('check_signatures')
      .delete()
      .eq('community_id', communityId)
      .eq('member_id', memberId);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete signature:', error);
    return { success: false, error: 'Failed to delete signature' };
  }
}

/** Get all checks for a community with details */
export async function getChecks(
  communityId: string,
  options?: { status?: string; limit?: number; offset?: number },
) {
  const admin = createAdminClient();

  let query = admin
    .from('checks')
    .select(
      '*, vendor:vendors!checks_payee_vendor_id_fkey(id, name, company), expense_account:accounts!checks_expense_account_id_fkey(code, name), bank_account:accounts!checks_bank_account_id_fkey(code, name), approvals:check_approvals(id, signer_member_id, status, approved_at, rejected_at, rejection_reason, signer:members!check_approvals_signer_member_id_fkey(id, name, email))',
    )
    .eq('community_id', communityId)
    .order('check_number', { ascending: false });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    const offset = options.offset || 0;
    query = query.range(offset, offset + options.limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch checks:', error);
    return [];
  }

  return (data || []) as unknown as CheckWithDetails[];
}

/** Get a single check with full details */
export async function getCheckById(communityId: string, checkId: string) {
  const admin = createAdminClient();

  const { data } = await admin
    .from('checks')
    .select(
      '*, vendor:vendors!checks_payee_vendor_id_fkey(id, name, company), expense_account:accounts!checks_expense_account_id_fkey(code, name), bank_account:accounts!checks_bank_account_id_fkey(code, name), approvals:check_approvals(id, signer_member_id, status, signature_id, approved_at, rejected_at, rejection_reason, signer:members!check_approvals_signer_member_id_fkey(id, name, email))',
    )
    .eq('id', checkId)
    .eq('community_id', communityId)
    .single();

  return data as unknown as CheckWithDetails | null;
}

/** Get signature for a specific member */
export async function getSignature(communityId: string, memberId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('check_signatures')
    .select('*')
    .eq('community_id', communityId)
    .eq('member_id', memberId)
    .eq('is_active', true)
    .single();

  return data;
}

/** Get all active signatures for a community */
export async function getSignatures(communityId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('check_signatures')
    .select('*, member:members!check_signatures_member_id_fkey(id, name, email)')
    .eq('community_id', communityId)
    .eq('is_active', true);

  return data || [];
}

/** Link a bank transaction to a check */
export async function linkCheckToTransaction(
  communityId: string,
  checkId: string,
  bankTransactionId: string,
) {
  try {
    await requirePermission(communityId, 'checks', 'read');
    const admin = createAdminClient();

    const { data: check } = await admin
      .from('checks')
      .select('journal_entry_id')
      .eq('id', checkId)
      .eq('community_id', communityId)
      .single();

    if (!check) return { success: false, error: 'Check not found' };

    // Link check to bank transaction
    await admin
      .from('checks')
      .update({
        bank_transaction_id: bankTransactionId,
        status: 'cleared',
      })
      .eq('id', checkId);

    // Update bank transaction
    await admin
      .from('bank_transactions')
      .update({
        status: 'matched',
        matched_journal_entry_id: check.journal_entry_id,
        match_method: 'auto_reference',
      })
      .eq('id', bankTransactionId)
      .eq('community_id', communityId);

    return { success: true };
  } catch (error) {
    console.error('Failed to link check to transaction:', error);
    return { success: false, error: 'Failed to link check' };
  }
}
