import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Pagewise: Book Reading & Study Companion',
  description: 'Read PDF books with structured chaptering, concise summaries, key ideas, spaced-repetition flashcards, interactive quizzes, and a context-aware reading assistant.',
  openGraph: {
    title: 'Pagewise: Book Reading & Study Companion',
    description: 'Read PDF books with structured chaptering, concise summaries, key ideas, spaced-repetition flashcards, interactive quizzes, and a context-aware reading assistant.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pagewise: Book Reading & Study Companion',
    description: 'Read PDF books with structured chaptering, concise summaries, key ideas, spaced-repetition flashcards, interactive quizzes, and a context-aware reading assistant.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
