'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, X, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { extractPdfInBrowser, ExtractionProgress } from '@/lib/pdf/extractor';
import { Book, Chapter } from '@/lib/db/types';
import { saveBook, saveChapters, db } from '@/lib/db';

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
    setIsProcessing(true);

    try {
      const extracted = await extractPdfInBrowser(file, p => {
        setProgress(p);
      });

      // Check for duplicate upload
      const existingBook = await db.books.where('fileHash').equals(extracted.fileHash).first();
      if (existingBook) {
        setIsProcessing(false);
        alert(`"${existingBook.title}" is already in your library! Opening it now.`);
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
        pdfDataUrl: extracted.pdfDataUrl,
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

      setIsProcessing(false);
      onSuccess(newBook);
      onClose();
    } catch (err: any) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 overflow-hidden p-6 space-y-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Add Book to Library
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              PDF is processed locally in your browser. Stored privately on your device.
            </p>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Drop Zone */}
        {!isProcessing ? (
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-stone-900 bg-stone-50 dark:border-stone-100 dark:bg-stone-800'
                : 'border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Click to select PDF or drag and drop here
                </p>
                <p className="text-xs text-stone-500">
                  Standard book or article PDF up to 80MB
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Processing Progress state */
          <div className="py-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                {progress?.statusText || 'Processing PDF...'}
              </h4>
              <p className="text-xs text-stone-500">
                Extracting text, analyzing outline, and building chapter sections
              </p>
            </div>

            {/* Progress Bar */}
            {progress && progress.totalPages > 0 && (
              <div className="space-y-1 max-w-xs mx-auto">
                <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-stone-900 dark:bg-stone-100 h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.round((progress.currentPage / progress.totalPages) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-stone-400">
                  <span>Page {progress.currentPage}</span>
                  <span>{progress.totalPages} Pages</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer info */}
        <div className="text-[11px] text-stone-400 flex items-center justify-between border-t border-stone-100 dark:border-stone-800/80 pt-4">
          <span>Automatic chapter detection</span>
          <span>Zero server upload</span>
        </div>
      </div>
    </div>
  );
}
