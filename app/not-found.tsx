import Link from 'next/link';
import { BookOpen, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-6 text-stone-900 dark:text-stone-100">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 shadow-sm text-center">
        <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-stone-700 dark:text-stone-300">
          <BookOpen className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Page Not Found</h1>
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
          The page or book chapter you are looking for does not exist or has been removed.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-medium rounded-xl hover:opacity-95 transition-opacity"
        >
          <Home className="w-4 h-4" />
          Return Home
        </Link>
      </div>
    </div>
  );
}
