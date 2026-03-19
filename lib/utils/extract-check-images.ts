import { PNG } from 'pngjs';
import type { AIExtractedCheck } from '@/lib/types/banking';

interface ExtractedCheckImage {
  checkNumber: string;
  pageNumber: number;
  imageData: Buffer;
  mimeType: 'image/png';
  width: number;
  height: number;
}

/**
 * Extract check images from a bank statement PDF.
 *
 * Uses pdfjs-dist to find embedded image XObjects on pages where the AI
 * identified check images. Bank statements typically embed check scans as
 * separate image objects within the PDF.
 *
 * Returns a map of check_number -> PNG buffer.
 */
export async function extractCheckImagesFromPDF(
  pdfBuffer: Buffer,
  checks: AIExtractedCheck[],
): Promise<ExtractedCheckImage[]> {
  // Only process checks that have a page number
  const checksWithPages = checks.filter((c) => c.page_number && c.page_number > 0);
  if (checksWithPages.length === 0) return [];

  // Dynamic import pdfjs-dist (ESM module)
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Disable worker for server-side usage
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const uint8Array = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const results: ExtractedCheckImage[] = [];

  // Deduplicate pages to avoid processing the same page twice
  const pageToChecks = new Map<number, AIExtractedCheck[]>();
  for (const check of checksWithPages) {
    const pageNum = check.page_number!;
    if (!pageToChecks.has(pageNum)) {
      pageToChecks.set(pageNum, []);
    }
    pageToChecks.get(pageNum)!.push(check);
  }

  for (const [pageNum, pageChecks] of pageToChecks) {
    if (pageNum < 1 || pageNum > pdf.numPages) continue;

    try {
      const page = await pdf.getPage(pageNum);
      const operatorList = await page.getOperatorList();

      // Find image XObjects on this page
      const imageNames: string[] = [];
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        // OPS.paintImageXObject = 85
        if (operatorList.fnArray[i] === 85) {
          const imgName = operatorList.argsArray[i]?.[0];
          if (imgName && typeof imgName === 'string') {
            imageNames.push(imgName);
          }
        }
      }

      if (imageNames.length > 0) {
        // Extract the largest image(s) on this page (likely the check scan)
        const extractedImages: { data: Uint8ClampedArray; width: number; height: number }[] = [];

        for (const imgName of imageNames) {
          try {
            const imgObj = await new Promise<{
              data: Uint8ClampedArray;
              width: number;
              height: number;
            } | null>((resolve) => {
              page.objs.get(imgName, (obj: unknown) => {
                const img = obj as {
                  data?: Uint8ClampedArray;
                  width?: number;
                  height?: number;
                } | null;
                if (img?.data && img?.width && img?.height) {
                  resolve({
                    data: img.data,
                    width: img.width,
                    height: img.height,
                  });
                } else {
                  resolve(null);
                }
              });
            });

            if (imgObj && imgObj.width > 100 && imgObj.height > 50) {
              extractedImages.push(imgObj);
            }
          } catch {
            // Skip images that can't be extracted
          }
        }

        // Sort by area (largest first) - check images are typically the largest on the page
        extractedImages.sort((a, b) => (b.width * b.height) - (a.width * a.height));

        // Assign images to checks on this page
        for (let i = 0; i < pageChecks.length && i < extractedImages.length; i++) {
          const img = extractedImages[i];
          const pngBuffer = rgbaToPng(img.data, img.width, img.height);
          results.push({
            checkNumber: pageChecks[i].check_number,
            pageNumber: pageNum,
            imageData: pngBuffer,
            mimeType: 'image/png',
            width: img.width,
            height: img.height,
          });
        }
      }

      page.cleanup();
    } catch (err) {
      console.error(`Failed to extract images from page ${pageNum}:`, err);
    }
  }

  pdf.cleanup();
  return results;
}

/**
 * Convert raw RGBA pixel data to a PNG buffer using pngjs.
 */
function rgbaToPng(data: Uint8ClampedArray, width: number, height: number): Buffer {
  const png = new PNG({ width, height });

  // pdfjs may return RGB (3 channels) or RGBA (4 channels)
  const channels = data.length / (width * height);

  if (channels === 4) {
    // RGBA - copy directly
    png.data = Buffer.from(data);
  } else if (channels === 3) {
    // RGB - add alpha channel
    for (let i = 0; i < width * height; i++) {
      png.data[i * 4] = data[i * 3];
      png.data[i * 4 + 1] = data[i * 3 + 1];
      png.data[i * 4 + 2] = data[i * 3 + 2];
      png.data[i * 4 + 3] = 255;
    }
  } else if (channels === 1) {
    // Grayscale - expand to RGBA
    for (let i = 0; i < width * height; i++) {
      png.data[i * 4] = data[i];
      png.data[i * 4 + 1] = data[i];
      png.data[i * 4 + 2] = data[i];
      png.data[i * 4 + 3] = 255;
    }
  }

  return PNG.sync.write(png);
}
