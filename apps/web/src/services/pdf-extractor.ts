import type { PdfTextExtractor } from '@finplanner/tax-extraction';

/**
 * Browser-side PDF text extractor using pdf.js.
 * Implements PdfTextExtractor interface from @finplanner/tax-extraction.
 */
export function createPdfTextExtractor(): PdfTextExtractor {
  return {
    async extractText(file: File): Promise<string> {
      const pdfjsLib = await import('pdfjs-dist');

      // Set worker source to bundled worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        /* @vite-ignore */ 'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const textParts: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: { str?: string }) => item.str ?? '')
          .join(' ');
        textParts.push(pageText);
      }

      return textParts.join('\n');
    },
  };
}
