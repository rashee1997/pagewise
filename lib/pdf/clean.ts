/**
 * Text Cleaning Utility for PDF Extraction:
 * - Joins hyphenated words across line breaks (e.g. "com-\npound" -> "compound")
 * - Removes isolated running page headers/footers
 * - Normalizes excessive whitespace while preserving true paragraphs
 */

export function cleanPdfText(rawText: string): string {
  if (!rawText) return '';

  return (
    rawText
      // Replace Windows CRLF with \n
      .replace(/\r\n/g, '\n')
      // Join words broken by hyphens at the end of lines
      .replace(/(\b[a-zA-Z]{2,})-\n\s*([a-zA-Z]{2,}\b)/g, '$1$2')
      // Remove isolated page numbers on their own lines (e.g. "\n  42  \n")
      .replace(/\n\s*\d+\s*\n/g, '\n\n')
      // Strip common running header patterns (e.g. "Chapter 2 | The Art of War")
      .replace(/\n[^\n]{1,60}\s*\|\s*[^\n]{1,60}\n/g, '\n')
      // Replace tabs & non-breaking spaces with standard space
      .replace(/[\t\u00A0\u200B]/g, ' ')
      // Collapse spaces on the same line
      .replace(/[ ]{2,}/g, ' ')
      // Collapse 3+ newlines down to 2 (clean paragraph break)
      .replace(/\n{3,}/g, '\n\n')
      // Trim each line
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim()
  );
}

/**
 * Detects if a document is primarily scanned image pages without extractable text
 */
export function isScannedDocument(totalTextLength: number, pageCount: number): boolean {
  if (pageCount === 0) return true;
  // If average extractable characters per page is less than 30 characters
  const averageCharsPerPage = totalTextLength / pageCount;
  return averageCharsPerPage < 30;
}
