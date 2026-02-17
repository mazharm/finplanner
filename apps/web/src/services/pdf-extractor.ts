import type { PdfTextExtractor } from '@finplanner/tax-extraction';

/**
 * Browser-side PDF text extractor using pdf.js.
 * Implements PdfTextExtractor interface from @finplanner/tax-extraction.
 */
const MAX_PDF_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_PDF_PAGES = 50;

export function createPdfTextExtractor(): PdfTextExtractor {
  return {
    async extractText(file: File): Promise<string> {
      if (file.size > MAX_PDF_FILE_SIZE) {
        throw new Error(`PDF file too large (${(file.size / 1024 / 1024).toFixed(1)} MB, max ${MAX_PDF_FILE_SIZE / 1024 / 1024} MB)`);
      }

      const pdfjsLib = await import('pdfjs-dist');

      // Set worker source to bundled worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        /* @vite-ignore */ 'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      if (pdf.numPages > MAX_PDF_PAGES) {
        throw new Error(`PDF has too many pages (${pdf.numPages}, max ${MAX_PDF_PAGES})`);
      }

      const textParts: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .filter((item) => 'str' in item)
          .map((item) => (item as { str: string }).str)
          .join(' ');
        textParts.push(pageText);
      }

      return textParts.join('\n');
    },
  };
}
