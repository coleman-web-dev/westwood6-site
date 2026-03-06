import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processStatementWithAI } from '@/lib/ai/process-statement';

export const maxDuration = 120; // Allow up to 2 minutes for AI processing

export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const communityId = formData.get('communityId') as string;
    const bankAccountId = formData.get('bankAccountId') as string | null;
    const periodMonth = parseInt(formData.get('periodMonth') as string);
    const periodYear = parseInt(formData.get('periodYear') as string);

    if (!file || !communityId || !periodMonth || !periodYear) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify board member
    const { data: member } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();

    // Upload file to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const storagePath = `${communityId}/statements/${periodYear}-${String(periodMonth).padStart(2, '0')}_${Date.now()}_${file.name}`;

    const { error: uploadError } = await admin.storage
      .from('hoa-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Create statement upload record
    const { data: upload, error: insertError } = await admin
      .from('statement_uploads')
      .insert({
        community_id: communityId,
        plaid_bank_account_id: bankAccountId || null,
        file_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        period_month: periodMonth,
        period_year: periodYear,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Process with AI
    const results = await processStatementWithAI({
      communityId,
      statementUploadId: upload.id,
      fileData: fileBuffer,
      mimeType: file.type,
    });

    return NextResponse.json({
      uploadId: upload.id,
      results,
    });
  } catch (error) {
    console.error('Statement processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 },
    );
  }
}
