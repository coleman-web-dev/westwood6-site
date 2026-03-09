import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';

/**
 * POST /api/extract-pdf
 * Extracts text from an uploaded PDF file server-side.
 * Uses unpdf (serverless-friendly, no worker/DOM dependencies).
 * Accepts multipart form data with a "file" field.
 * Returns { text, pageCount } on success.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 },
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    const result = await extractText(data);
    const trimmed = result.text?.join('\n\n').trim() ?? '';

    return NextResponse.json({
      text: trimmed,
      pageCount: result.totalPages,
    });
  } catch (err) {
    console.error('PDF extraction error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message.includes('password')) {
      return NextResponse.json(
        { error: 'This PDF is password-protected. Please remove the password and try again.' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to extract text from PDF.' },
      { status: 500 },
    );
  }
}
