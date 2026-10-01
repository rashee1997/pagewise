import type {Metadata, Viewport} from 'next';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0a09' },
  ],
};

// Runs before first paint so dark-theme users never see a light flash.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('pagewise_theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
