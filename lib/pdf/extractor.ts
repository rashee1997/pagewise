import { Chapter } from '../db/types';
import { computeInputHash } from '../study/dedupe';
import { cleanPdfText, isScannedDocument } from './clean';
import { computeFileHash } from './fileHash';

export interface ExtractionProgress {
  stage: 'loading' | 'pages' | 'chaptering' | 'complete' | 'error';
  currentPage: number;
  totalPages: number;
  statusText: string;
}

export interface ExtractedBookData {
  title: string;
  author?: string;
  pageCount: number;
  chapters: Array<Omit<Chapter, 'id' | 'bookId'>>;
  coverDataUrl?: string;
  pdfBlob?: Blob;
  fileHash: string;
  isScanned: boolean;
  scannedMessage?: string;
}

/**
 * Chapter detection patterns
 */
const CHAPTER_REGEXES = [
  /^(?:Chapter|CHAPTER)\s+([0-9IVXLCDM]+|[A-Za-z]+)(?:[\s:.\u2013\u2014]+(.*))?$/i,
  /^(?:Part|PART|Book|BOOK|Section|SECTION)\s+([0-9IVXLCDM]+)(?:[\s:.\u2013\u2014]+(.*))?$/i,
  /^(?:ACT|Act)\s+([0-9IVXLCDM]+)(?:[\s:.\u2013\u2014]+(.*))?$/i,
  /^([IVXLCDM]+)\.\s+([A-Z].*)$/, // e.g. "I. Laying Plans"
  /^(?:Prologue|Epilogue|Introduction|Conclusion|Preface|Afterword)(?:\s*:.*)?$/i,
];

export async function extractPdfInBrowser(
  fileOrBuffer: File | ArrayBuffer,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedBookData> {
  if (typeof window === 'undefined') {
    throw new Error('PDF extraction is only supported in browser environment');
  }

  onProgress?.({
    stage: 'loading',
    currentPage: 0,
    totalPages: 0,
    statusText: 'Loading PDF document engine...',
  });

  let pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(true);
        } else {
          reject(new Error('Failed to initialize pdfjsLib from CDN'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load PDF.js script from CDN'));
      document.head.appendChild(script);
    });
  } else {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }

  let arrayBuffer: ArrayBuffer;
  let fileName = 'Untitled Book';
  let pdfBlob: Blob | undefined = undefined;

  if (fileOrBuffer instanceof File) {
    fileName = fileOrBuffer.name.replace(/\.[^/.]+$/, '');
    arrayBuffer = await fileOrBuffer.arrayBuffer();
    // Keep the original file so it can be persisted in IndexedDB (blob URLs do not survive reloads)
    pdfBlob = fileOrBuffer;
  } else {
    arrayBuffer = fileOrBuffer;
  }

  // Calculate fileHash to detect/block duplicates
  const fileHash = await computeFileHash(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  onProgress?.({
    stage: 'pages',
    currentPage: 0,
    totalPages: numPages,
    statusText: `Extracting text across ${numPages} pages...`,
  });

  // Extract metadata if available
  let title = fileName;
  let author: string | undefined;

  try {
    const meta = await pdfDoc.getMetadata();
    const info = (meta?.info || {}) as Record<string, any>;
    if (info.Title && typeof info.Title === 'string' && info.Title.trim().length > 2) {
      title = info.Title.trim();
    }
    if (info.Author && typeof info.Author === 'string' && info.Author.trim().length > 1) {
      author = info.Author.trim();
    }
  } catch (e) {
    // Ignore metadata errors
  }

  // Generate cover thumbnail from Page 1
  let coverDataUrl: string | undefined;
  try {
    const firstPage = await pdfDoc.getPage(1);
    const viewport = firstPage.getViewport({ scale: 0.6 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      await (firstPage.render as any)({ canvasContext: ctx, viewport, canvas }).promise;
      coverDataUrl = canvas.toDataURL('image/jpeg', 0.82);
    }
  } catch (e) {
    console.warn('Could not generate cover thumbnail from page 1', e);
  }

  // Extract text per page
  const pageTexts: { pageNum: number; text: string }[] = [];
  let totalChars = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const textItems = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      const cleaned = cleanPdfText(textItems);
      pageTexts.push({ pageNum, text: cleaned });
      totalChars += cleaned.length;

      if (pageNum % 5 === 0 || pageNum === numPages) {
        onProgress?.({
          stage: 'pages',
          currentPage: pageNum,
          totalPages: numPages,
          statusText: `Reading page ${pageNum} of ${numPages}...`,
        });
      }
    } catch (e) {
      console.warn(`Error reading page ${pageNum}:`, e);
      pageTexts.push({ pageNum, text: '' });
    }
  }

  // Check for scanned PDF
  const isScanned = isScannedDocument(totalChars, numPages);

  onProgress?.({
    stage: 'chaptering',
    currentPage: numPages,
    totalPages: numPages,
    statusText: 'Structuring book into readable chapters...',
  });

  // Try outline bookmarks first
  let detectedChapters: Array<{
    title: string;
    startPage: number;
    endPage: number;
    text: string;
  }> = [];

  try {
    const outline = await pdfDoc.getOutline();
    if (outline && Array.isArray(outline) && outline.length >= 2) {
      for (let i = 0; i < outline.length; i++) {
        const item = outline[i];
        let destPage = 1;
        if (typeof item.dest === 'string') {
          const dest = await pdfDoc.getDestination(item.dest);
          if (dest && dest[0]) {
            const pageIndex = await pdfDoc.getPageIndex(dest[0]);
            destPage = pageIndex + 1;
          }
        } else if (Array.isArray(item.dest) && item.dest[0]) {
          const pageIndex = await pdfDoc.getPageIndex(item.dest[0]);
          destPage = pageIndex + 1;
        }

        detectedChapters.push({
          title: item.title?.trim() || `Chapter ${i + 1}`,
          startPage: destPage,
          endPage: numPages,
          text: '',
        });
      }

      detectedChapters.sort((a, b) => a.startPage - b.startPage);
      for (let i = 0; i < detectedChapters.length; i++) {
        if (i < detectedChapters.length - 1) {
          detectedChapters[i].endPage = Math.max(
            detectedChapters[i].startPage,
            detectedChapters[i + 1].startPage - 1
          );
        } else {
          detectedChapters[i].endPage = numPages;
        }
      }
    }
  } catch (e) {
    console.warn('PDF outline could not be parsed, falling back to text detection', e);
  }

  // If outline detection did not yield at least 2 chapters, scan text for headings
  if (detectedChapters.length < 2) {
    const headingMatches: Array<{ title: string; pageNum: number }> = [];

    for (const { pageNum, text } of pageTexts) {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (const line of lines.slice(0, 10)) {
        if (line.length > 100) continue;
        for (const regex of CHAPTER_REGEXES) {
          if (regex.test(line)) {
            if (!headingMatches.some(m => m.pageNum === pageNum)) {
              headingMatches.push({ title: line, pageNum });
            }
            break;
          }
        }
      }
    }

    if (headingMatches.length >= 2) {
      detectedChapters = headingMatches.map((h, i) => {
        const nextMatch = headingMatches[i + 1];
        return {
          title: h.title,
          startPage: h.pageNum,
          endPage: nextMatch ? Math.max(h.pageNum, nextMatch.pageNum - 1) : numPages,
          text: '',
        };
      });
    }
  }

  // Fallback: window grouping (~10-15 pages per section)
  if (detectedChapters.length < 1) {
    const pagesPerChapter = numPages <= 15 ? numPages : numPages <= 60 ? 8 : 12;
    let chIdx = 1;
    for (let p = 1; p <= numPages; p += pagesPerChapter) {
      const end = Math.min(numPages, p + pagesPerChapter - 1);
      detectedChapters.push({
        title: `Section ${chIdx}: Pages ${p}–${end}`,
        startPage: p,
        endPage: end,
        text: '',
      });
      chIdx++;
    }
  }

  // Populate text for each chapter
  const finalChapters: Array<Omit<Chapter, 'id' | 'bookId'>> = detectedChapters.map((ch, idx) => {
    const relevantPages = pageTexts.filter(p => p.pageNum >= ch.startPage && p.pageNum <= ch.endPage);
    const combinedText = relevantPages.map(p => p.text).join('\n\n').trim();
    const tokenEst = Math.round(combinedText.split(/\s+/).length * 1.3);

    return {
      index: idx,
      title: ch.title,
      startPage: ch.startPage,
      endPage: ch.endPage,
      text: combinedText || (isScanned ? 'Scanned document: text could not be extracted.' : 'No text content available.'),
      textHash: computeInputHash(combinedText, 'chapter', 1),
      tokenEstimate: tokenEst,
    };
  });

  onProgress?.({
    stage: 'complete',
    currentPage: numPages,
    totalPages: numPages,
    statusText: 'Ready to read and study!',
  });

  return {
    title,
    author,
    pageCount: numPages,
    chapters: finalChapters,
    coverDataUrl,
    pdfBlob,
    fileHash,
    isScanned,
    scannedMessage: isScanned
      ? "This PDF is scanned images. Text reading isn't supported yet (OCR planned later)."
      : undefined,
  };
}
