/**
 * POST /api/agreements/backfill-pdfs
 *
 * One-time backfill: generates PDFs for existing signed agreements
 * that don't have a file in Storage yet.
 * Board-only, authenticated.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateAgreementPdf, agreementPdfFilename } from '@/lib/utils/generate-agreement-pdf';
import { format } from 'date-fns';

export async function POST() {
  // 1. Authenticate
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 2. Verify board member
  const { data: member } = await supabase
    .from('members')
    .select('id, community_id, system_role')
    .eq('user_id', user.id)
    .eq('is_approved', true)
    .single();

  if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
    return NextResponse.json({ error: 'Board access required' }, { status: 403 });
  }

  // 3. Get community info
  const { data: community } = await supabase
    .from('communities')
    .select('id, name, address')
    .eq('id', member.community_id)
    .single();

  if (!community) {
    return NextResponse.json({ error: 'Community not found' }, { status: 404 });
  }

  // 4. Find signed agreements that need PDFs
  // Join to documents to find which ones already have a file
  const { data: agreements } = await supabase
    .from('signed_agreements')
    .select(`
      id, filled_text, signer_name, signed_at,
      amenities(name),
      reservations(start_datetime),
      members!signer_member_id(first_name, last_name),
      units(unit_number)
    `)
    .eq('community_id', community.id)
    .eq('is_paper', false);

  if (!agreements || agreements.length === 0) {
    return NextResponse.json({ message: 'No agreements to backfill', count: 0 });
  }

  // Check which already have document rows with file_path
  const { data: existingDocs } = await supabase
    .from('documents')
    .select('signed_agreement_id, file_path')
    .eq('community_id', community.id)
    .not('signed_agreement_id', 'is', null);

  const hasFile = new Set(
    (existingDocs ?? [])
      .filter((d) => d.file_path && !d.file_path.startsWith('e-signed://'))
      .map((d) => d.signed_agreement_id)
  );

  const needsPdf = agreements.filter((a) => !hasFile.has(a.id));

  if (needsPdf.length === 0) {
    return NextResponse.json({ message: 'All agreements already have PDFs', count: 0 });
  }

  // 5. Find or create Agreements folder structure
  let rootId: string | null = null;
  {
    const { data } = await supabase
      .from('document_folders')
      .select('id')
      .eq('community_id', community.id)
      .eq('name', 'Agreements')
      .is('parent_id', null)
      .single();

    if (data) {
      rootId = data.id;
    } else {
      const { data: created } = await supabase
        .from('document_folders')
        .insert({
          community_id: community.id,
          name: 'Agreements',
          parent_id: null,
          sort_order: 6,
          created_by: member.id,
        })
        .select('id')
        .single();
      rootId = created?.id ?? null;
    }
  }

  if (!rootId) {
    return NextResponse.json({ error: 'Failed to create Agreements folder' }, { status: 500 });
  }

  // 6. Generate and upload PDFs
  let successCount = 0;
  const errors: string[] = [];

  for (const agreement of needsPdf) {
    try {
      const amenity = agreement.amenities as unknown as { name: string } | null;
      const reservation = agreement.reservations as unknown as { start_datetime: string } | null;
      const amenityName = amenity?.name ?? 'Unknown';
      const signerName = agreement.signer_name ?? 'Unknown';
      const signedAt = agreement.signed_at
        ? format(new Date(agreement.signed_at), 'MMMM d, yyyy')
        : 'Unknown date';
      const reservationDate = reservation?.start_datetime
        ? format(new Date(reservation.start_datetime), 'MMM d, yyyy')
        : 'Unknown date';

      // Generate PDF
      const pdfBlob = generateAgreementPdf({
        communityName: community.name,
        communityAddress: community.address ?? '',
        amenityName,
        filledText: agreement.filled_text ?? '',
        signerName,
        signedAt,
      });

      const filename = agreementPdfFilename({ amenityName, signerName });
      const filePath = `${community.id}/agreements/${Date.now()}_${filename}`;

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('hoa-documents')
        .upload(filePath, pdfBlob, { contentType: 'application/pdf' });

      if (uploadError) {
        errors.push(`Upload failed for ${signerName}: ${uploadError.message}`);
        continue;
      }

      // Find or create amenity subfolder
      let subfolderId: string | null = null;
      {
        const { data } = await supabase
          .from('document_folders')
          .select('id')
          .eq('community_id', community.id)
          .eq('parent_id', rootId)
          .eq('name', amenityName)
          .single();

        if (data) {
          subfolderId = data.id;
        } else {
          const { data: created } = await supabase
            .from('document_folders')
            .insert({
              community_id: community.id,
              name: amenityName,
              parent_id: rootId,
              sort_order: 0,
              created_by: member.id,
            })
            .select('id')
            .single();
          subfolderId = created?.id ?? null;
        }
      }

      // Update existing document row or create one
      const existingDoc = (existingDocs ?? []).find((d) => d.signed_agreement_id === agreement.id);
      if (existingDoc) {
        await supabase
          .from('documents')
          .update({ file_path: filePath, file_size: pdfBlob.size })
          .eq('signed_agreement_id', agreement.id);
      } else if (subfolderId) {
        await supabase.from('documents').insert({
          community_id: community.id,
          title: `${amenityName} Agreement - ${signerName} - ${reservationDate}`,
          category: 'other',
          folder_id: subfolderId,
          file_path: filePath,
          file_size: pdfBlob.size,
          visibility: 'private',
          is_public: false,
          uploaded_by: member.id,
          signed_agreement_id: agreement.id,
        });
      }

      successCount++;
    } catch (err) {
      errors.push(`Failed for agreement ${agreement.id}: ${err}`);
    }
  }

  return NextResponse.json({
    message: `Generated ${successCount} of ${needsPdf.length} PDFs`,
    count: successCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}
