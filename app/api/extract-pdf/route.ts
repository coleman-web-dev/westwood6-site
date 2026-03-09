import { NextRequest, NextResponse } from 'next/server';

// Pre-load the worker module so pdfjs-dist finds it on globalThis.
// This avoids filesystem path issues on Vercel's serverless environment.
// pdfjs-dist checks globalThis.pdfjsWorker.WorkerMessageHandler before
// trying to spawn a Web Worker, making this the correct server-side approach.
async function ensureWorkerLoaded() {
  if (!(globalThis as Record<string, unknown>).pdfjsWorker) {
    const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    (globalThis as Record<string, unknown>).pdfjsWorker = worker;
  }
}

/**
 * POST /api/extract-pdf
 * Extracts text from an uploaded PDF file server-side using pdfjs-dist legacy build.
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

    // Load the worker module into globalThis so pdfjs-dist uses it directly
    await ensureWorkerLoaded();

    // Use legacy build which works in Node.js without DOM/canvas
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items as Array<{ str?: string }>)
        .map((item: { str?: string }) => item.str ?? '')
        .join(' ');
      fullText += pageText + '\n\n';
    }

    const trimmed = fullText.trim();

    return NextResponse.json({
      text: trimmed,
      pageCount: pdf.numPages,
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
