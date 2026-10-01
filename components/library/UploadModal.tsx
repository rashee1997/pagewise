'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, AlertCircle, Loader2 } from 'lucide-react';
import { extractPdfInBrowser, ExtractionProgress } from '@/lib/pdf/extractor';
import { Book, Chapter } from '@/lib/db/types';
import { saveBook, saveChapters, savePdfBlob, db } from '@/lib/db';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBook: Book) => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please upload a PDF document (.pdf format).');
      return;
    }

    if (file.size > 80 * 1024 * 1024) {
      setError('File size exceeds 80MB. Please choose a smaller PDF.');
      return;
    }

    setError(null);
    cancelledRef.current = false;
    setIsProcessing(true);

    try {
      const extracted = await extractPdfInBrowser(file, p => {
        setProgress(p);
      });

      if (cancelledRef.current) return;

      // Check for duplicate upload
      const existingBook = await db.books.where('fileHash').equals(extracted.fileHash).first();
      if (existingBook) {
        setIsProcessing(false);
        toast({ message: `"${existingBook.title}" is already in your library — opening it.` });
        onSuccess(existingBook);
        onClose();
        return;
      }

      if (extracted.isScanned) {
        setError("This PDF is scanned images. Text reading isn't supported yet (OCR planned later).");
        setIsProcessing(false);
        return;
      }

      if (extracted.chapters.length === 0) {
        setError('Could not extract readable text from this document.');
        setIsProcessing(false);
        return;
      }

      const bookId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newBook: Book = {
        id: bookId,
        title: extracted.title || file.name.replace(/\.[^/.]+$/, ''),
        author: extracted.author || 'Author',
        pageCount: extracted.pageCount,
        chapterCount: extracted.chapters.length,
        fileHash: extracted.fileHash,
        addedAt: Date.now(),
        lastOpenedAt: Date.now(),
        coverDataUrl: extracted.coverDataUrl,
        hasPdf: !!extracted.pdfBlob,
        progress: {
          chapterId: `${bookId}_ch_0`,
          chapterIndex: 0,
          page: 1,
          percent: 0,
        },
        status: 'ready',
      };

      const chapters: Chapter[] = extracted.chapters.map((ch, idx) => ({
        id: `${bookId}_ch_${idx}`,
        bookId,
        index: idx,
        title: ch.title,
        startPage: ch.startPage,
        endPage: ch.endPage,
        text: ch.text,
        textHash: ch.textHash,
        tokenEstimate: ch.tokenEstimate,
      }));

      await saveBook(newBook);
      await saveChapters(chapters);
      if (extracted.pdfBlob) await savePdfBlob(bookId, extracted.pdfBlob);
      if (cancelledRef.current) return;

      setIsProcessing(false);
      onSuccess(newBook);
      onClose();
    } catch (err: any) {
      if (cancelledRef.current) return;
      console.error('PDF extraction failed:', err);
      setError(err?.message || 'Failed to parse the PDF document. Please try another file.');
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const pct = progress && progress.totalPages > 0 ? Math.round((progress.currentPage / progress.totalPages) * 100) : 0;

  const handleCancel = () => {
    cancelledRef.current = true;
    setIsProcessing(false);
    setProgress(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add book to library"
      dismissible={!isProcessing}
      panelClassName="w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 space-y-6"
    >
      <p className="text-sm text-stone-600 dark:text-stone-400 -mt-4">
        PDFs are processed locally in your browser and stored privately on your device.
      </p>

      {!isProcessing ? (
        <>
          <input
            ref={fileInputRef}
            id="pdf-file-input"
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            tabIndex={-1}
            onChange={e => {
              if (e.target.files && e.target.files.length > 0) {
                handleProcessFile(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            data-autofocus
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-stone-900 bg-stone-50 dark:border-stone-100 dark:bg-stone-800'
                : 'border-stone-300 dark:border-stone-700 hover:border-stone-500 dark:hover:border-stone-500'
            }`}
          >
            <span className="flex flex-col items-center gap-3">
              <span className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" aria-hidden="true" />
              </span>
              <span className="space-y-1">
                <span className="block text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Choose a PDF or drag it here
                </span>
                <span className="block text-xs text-stone-600 dark:text-stone-400">
                  Book or article PDF up to 80 MB
                </span>
              </span>
            </span>
          </button>
        </>
      ) : (
        <div className="py-6 space-y-4 text-center" aria-busy="true">
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          </div>

          <div className="space-y-1 min-h-14" role="status" aria-live="polite">
            <p className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {progress?.statusText || 'Processing PDF…'}
            </p>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Extracting text, analyzing outline, and building chapters
            </p>
          </div>

          <div className="space-y-1 max-w-xs mx-auto">
            <div
              role="progressbar"
              aria-label="PDF processing progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden"
            >
              <div
                className="bg-stone-900 dark:bg-stone-100 h-full w-full rounded-full origin-left transition-transform duration-300"
                style={{ transform: `scaleX(${pct / 100})` }}
              />
            </div>
            <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400 tabular-nums">
              <span>{progress ? `Page ${progress.currentPage}` : ' '}</span>
              <span>{progress ? `${progress.totalPages} pages` : ' '}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-sm text-red-800 dark:text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800/80 pt-4">
        <span className="text-xs text-stone-600 dark:text-stone-400">Automatic chapter detection · No server upload</span>
        {!isProcessing && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Close
          </button>
        )}
      </div>
    </Dialog>
  );
}
