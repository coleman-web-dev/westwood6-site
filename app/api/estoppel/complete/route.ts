import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmailDirect } from '@/lib/email/resend';
import { generateEstoppelPdf, estoppelPdfFilename } from '@/lib/utils/generate-estoppel-pdf';
import { generateLedgerPdf, ledgerPdfFilename } from '@/lib/utils/generate-ledger-pdf';
import { EstoppelCertificateEmail } from '@/lib/email/templates/estoppel-certificate';
import { logAuditEvent } from '@/lib/audit';
import type { EstoppelSettings, Invoice, Payment, WalletTransaction, LedgerEntry } from '@/lib/types/database';

/**
 * POST /api/estoppel/complete
 * Board member approves and sends an estoppel certificate.
 * Generates PDF, stores in Supabase Storage, emails to requester.
 * Requires authentication + board role.
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { requestId, communityId, boardFields, signatureName, signatureTitle } = await req.json();

    if (!requestId || !communityId || !signatureName || !signatureTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify board membership
    const { data: member } = await supabase
      .from('members')
      .select('id, system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
      return NextResponse.json({ error: 'Board access required' }, { status: 403 });
    }

    // Fetch the request
    const { data: estoppelRequest, error: requestError } = await supabase
      .from('estoppel_requests')
      .select('*')
      .eq('id', requestId)
      .eq('community_id', communityId)
      .single();

    if (requestError || !estoppelRequest) {
      return NextResponse.json({ error: 'Estoppel request not found' }, { status: 404 });
    }

    if (estoppelRequest.status === 'completed') {
      return NextResponse.json({ error: 'This request has already been completed' }, { status: 400 });
    }

    if (estoppelRequest.status === 'cancelled') {
      return NextResponse.json({ error: 'This request has been cancelled' }, { status: 400 });
    }

    // Fetch community for template and name
    const { data: community } = await supabase
      .from('communities')
      .select('name, address, theme')
      .eq('id', communityId)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const theme = community.theme as Record<string, unknown> | null;
    const estoppelSettings = theme?.estoppel_settings as EstoppelSettings | undefined;

    if (!estoppelSettings?.template) {
      return NextResponse.json({ error: 'Estoppel template not configured' }, { status: 400 });
    }

    const requesterFields = estoppelRequest.requester_fields as Record<string, string>;
    const systemFields = estoppelRequest.system_fields as Record<string, string>;
    const completionDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // Generate PDF
    const pdfBlob = generateEstoppelPdf({
      communityName: community.name,
      communityAddress: community.address || '',
      template: estoppelSettings.template,
      requesterFields,
      systemFields,
      boardFields: boardFields || {},
      signatureName,
      signatureTitle,
      completionDate,
    });

    const pdfArrayBuffer = await pdfBlob.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    // ── Generate ledger PDF attachment ──
    let ledgerBuffer: Buffer | null = null;
    let ledgerFilename = '';

    if (estoppelRequest.unit_id) {
      const [invoiceResult, paymentResult, walletResult, unitResult, ownerResult] = await Promise.all([
        supabase
          .from('invoices')
          .select('*')
          .eq('unit_id', estoppelRequest.unit_id)
          .neq('status', 'voided')
          .order('due_date', { ascending: true }),
        supabase
          .from('payments')
          .select('*')
          .eq('unit_id', estoppelRequest.unit_id)
          .order('created_at', { ascending: true }),
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('unit_id', estoppelRequest.unit_id)
          .order('created_at', { ascending: true }),
        supabase
          .from('units')
          .select('unit_number, address')
          .eq('id', estoppelRequest.unit_id)
          .single(),
        supabase
          .from('members')
          .select('first_name, last_name')
          .eq('unit_id', estoppelRequest.unit_id)
          .eq('member_role', 'owner')
          .limit(1)
          .single(),
      ]);

      const invoices = (invoiceResult.data as Invoice[]) ?? [];
      const payments = (paymentResult.data as Payment[]) ?? [];
      const walletTxs = (walletResult.data as WalletTransaction[]) ?? [];
      const unitData = unitResult.data;
      const ownerData = ownerResult.data;

      const ledgerEntries: LedgerEntry[] = [];

      for (const inv of invoices) {
        ledgerEntries.push({
          entry_date: inv.due_date,
          entry_type: 'charge',
          description: inv.title,
          amount: inv.amount,
          running_balance: 0,
          reference_id: inv.id,
          member_name: null,
        });
      }

      for (const pmt of payments) {
        ledgerEntries.push({
          entry_date: pmt.created_at,
          entry_type: 'payment',
          description: 'Payment',
          amount: -pmt.amount,
          running_balance: 0,
          reference_id: pmt.id,
          member_name: null,
        });
      }

      for (const tx of walletTxs) {
        const isWalletOnly =
          tx.type === 'manual_credit' &&
          (tx.description?.includes('monthly invoicing conversion') ||
            tx.description?.includes('imported from previous system') ||
            tx.description?.includes('Wallet import correction'));
        if (isWalletOnly) continue;

        ledgerEntries.push({
          entry_date: tx.created_at,
          entry_type: tx.type,
          description: tx.description ?? tx.type.replace(/_/g, ' '),
          amount: -tx.amount,
          running_balance: 0,
          reference_id: tx.reference_id,
          member_name: null,
        });
      }

      ledgerEntries.sort((a, b) => a.entry_date.localeCompare(b.entry_date));

      let running = 0;
      for (const entry of ledgerEntries) {
        running += entry.amount;
        entry.running_balance = running;
      }

      if (ledgerEntries.length > 0) {
        const unitLabel = unitData
          ? `Unit ${unitData.unit_number}${unitData.address ? ' - ' + unitData.address : ''}`
          : requesterFields.property_address || 'Unit';
        const ownerName = ownerData
          ? `${ownerData.first_name} ${ownerData.last_name}`
          : requesterFields.owner_names || '';

        const ledgerBlob = generateLedgerPdf({
          communityName: community.name,
          ownerName,
          unitLabel,
          entries: ledgerEntries,
          generatedDate: completionDate,
        });

        const ledgerArrayBuffer = await ledgerBlob.arrayBuffer();
        ledgerBuffer = Buffer.from(ledgerArrayBuffer);
        ledgerFilename = ledgerPdfFilename({ unitLabel, communityName: community.name });
      }
    }

    // Store PDF in Supabase Storage
    const filename = estoppelPdfFilename({
      propertyAddress: requesterFields.property_address,
      communityName: community.name,
    });
    const storagePath = `${communityId}/estoppel/${requestId}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('community-files')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('PDF upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to store PDF' }, { status: 500 });
    }

    // Render email HTML
    const emailElement = EstoppelCertificateEmail({
      communityName: community.name,
      propertyAddress: requesterFields.property_address || 'N/A',
      ownerNames: requesterFields.owner_names || 'N/A',
      completionDate,
    });
    const emailHtml = await render(emailElement);

    // Send email with PDF attachments
    const propertyAddr = requesterFields.property_address || 'Property';
    const emailAttachments: Array<{ filename: string; content: Buffer }> = [
      { filename, content: pdfBuffer },
    ];
    if (ledgerBuffer && ledgerFilename) {
      emailAttachments.push({ filename: ledgerFilename, content: ledgerBuffer });
    }

    await sendEmailDirect({
      to: estoppelRequest.delivery_email,
      subject: `Estoppel Certificate for ${propertyAddr} - ${community.name}`,
      html: emailHtml,
      attachments: emailAttachments,
    });

    // Update request status
    await supabase
      .from('estoppel_requests')
      .update({
        status: 'completed',
        board_fields: boardFields || {},
        completed_by: member.id,
        completed_by_name: signatureName,
        completed_by_title: signatureTitle,
        signature_name: signatureName,
        completed_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        pdf_path: storagePath,
      })
      .eq('id', requestId);

    // Board notification
    void supabase.rpc('create_board_notifications', {
      p_community_id: communityId,
      p_type: 'general',
      p_title: 'Estoppel certificate sent',
      p_body: `Certificate for ${propertyAddr} has been completed and emailed to ${estoppelRequest.delivery_email}.`,
      p_reference_id: requestId,
      p_reference_type: 'estoppel_request',
    });

    await logAuditEvent({
      communityId,
      actorId: user.id,
      action: 'estoppel_completed',
      targetType: 'estoppel_request',
      targetId: requestId,
      metadata: { delivery_email: estoppelRequest.delivery_email, property: propertyAddr },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Estoppel complete error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
