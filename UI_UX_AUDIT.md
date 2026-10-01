# Pagewise — UI/UX Architectural Audit

**Scope.** `/home/user/pagewise` (Next.js 15, React 19, Tailwind 4, Dexie/IndexedDB, Gemini). The audit prompt had unfilled placeholders, so I set: `REPO_PATH=/home/user/pagewise`, `MARKET_DOMAIN=AI-assisted reading & spaced-repetition study apps` (Readwise Reader, NotebookLM, Anki/RemNote, Kindle/Apple Books), `TARGET_BREAKPOINTS=320/768/1024/1440`.

**Method & honesty note.** This is a *static* audit: every file under `app/`, `components/` and the relevant parts of `lib/` was read; no code was edited. Contrast ratios below were computed from Tailwind's stone/amber/emerald hex values. **I did not run the app in a browser**, so the 320 px overflow and 60 fps claims are inferred from the markup and need a Playwright pass to confirm (see §3.4). Competitor claims come from the cited pages; where a search returned little, I say so.

---

## 1. Executive Scorecard & External Benchmark Summary

### Current UI Health Matrix

| Dimension | Score | Primary Codebase Bottleneck | Industry Benchmark Standard |
|---|---|---|---|
| Visual Polish & Typography | **5/10** | Coherent stone palette and serif reading face, but 10–11 px text used ~60× (`text-[10px]`/`text-[11px]` across `SettingsView`, `AssistantDrawer`, `ReviewSession`, `TodayView`); `text-stone-400` used 129× | Readwise Reader / Apple Books: ≥12 px chrome text, one type scale |
| Ergonomics & Flow | **3/10** | Dead/broken features: ⌘K can't open the palette, notes are never saved, onboarding is never mounted, scroll position isn't saved, 7 `alert()/confirm()/prompt()` calls | Reader: every action reachable from ⌘K and keyboard; highlights/notes persist and resurface |
| Accessibility (WCAG 2.2 AA) | **2/10** | 0 `:focus-visible` rules in the repo; 4 `aria-*` hits total; no dialog semantics or focus trap; clickable `div`s; body text at 2.4–2.5:1 | WCAG 2.2 AA (2.4.7/2.4.11/2.5.8/4.1.2/1.4.3) |
| Fluid Responsiveness & Layout | **5/10** | Sensible `md:` sidebar→bottom-nav split, but the reader header crams ~7 controls into one row at <375 px; toast collides with bottom nav | Container-aware, thumb-reachable controls |
| Motion Polish & Feedback | **4/10** | `motion` + tailwind-animate used, but **no `prefers-reduced-motion` handling anywhere**; `transition-all` on width; AI waits show text, not streaming | Linear/Raycast: transform/opacity only, reduced-motion respected, streamed output |

### Competitive Landscape Teardown

- **Readwise Reader.** Command palette on Cmd/Ctrl+K "contains virtually any action"; shortcuts discoverable by hover, the palette, or `?`; you can "read, highlight, and annotate without touching the mouse"; its Ghostreader AI works at word, paragraph/highlight, section and whole-document level. ([Getting Started](https://blog.readwise.io/p/bf87944f-b0fe-4f08-a461-f75ab8aded6a/), [FAQ](https://blog.readwise.io/p/f8c0f71c-fe5f-4025-af57-f9f65c53fed7/)). *Pagewise gap:* palette is broken and shallow; selection AI is a single transient popup; notes/highlights don't persist.
- **NotebookLM.** Answers are source-grounded with clickable inline citations back to the source; sources panel on one side, chat/notes on the other; one-click "Studio" generation of study guides, quizzes, flashcards ([UChicago overview](https://academictech.uchicago.edu/2026/04/06/google-notebooklm-an-ai-tool-for-research-and-studying/), [Codecademy](https://www.codecademy.com/article/how-to-use-notebooklm)). *Gap:* Pagewise chat has no citations and a modal drawer that hides the text being discussed.
- **Anki / RemNote / Quizlet.** Anki's FSRS and the Space → Again/Hard/Good/Easy loop is the standard Pagewise copies; Anki's UI is widely called dated, RemNote wins on a cleaner UI and a shortcut that turns any bullet into a card linked to its source context ([RemNote comparison](https://www.remnote.com/blog/anki-vs-quizlet-vs-remnote), [alternatives](https://www.remnote.com/blog/best-anki-alternatives) — note this is a vendor blog, treat comparative claims as marketing). *Gap:* Pagewise's review loop is functionally right but lacks a11y and a progress/session summary; "Make Card" from selection gives a generic front (`What is the significance of: "…"?`).
- **Kindle/Apple Books.** Reading position is device-specific; progress that works is position-based, not chapter-based ([sync discussion](https://www.svartling.net/2024/11/how-to-sync-reading-progress-between.html)). *Gap:* Pagewise stores only `chapterIndex`, so "% read" jumps in whole-chapter steps.
- **Standards.** WCAG 2.2 AA adds 2.4.11 Focus Not Obscured (sticky headers must not hide the focused element), 2.5.8 Target Size ≥ 24×24 CSS px, 2.5.7 Dragging alternatives ([WCAG 2.2 guide](https://wcagpatterns.com/guides/wcag-2-2), [AllAccessible](https://www.allaccessible.org/blog/wcag-22-complete-guide-2025)). Pagewise's sticky reader header + footer and 16–24 px icon buttons are directly in scope.

**What I could not verify:** Linear/Raycast/Stripe motion specifics — my searches returned nothing usable on them, so §3 motion tokens are standard practice, not Linear-sourced.

---

## 2. Existing UI Refinement Matrix

Severity: **P0** = feature broken / blocks users; **P1** = AA failure or data loss; **P2** = polish.

| # | Component & File Anchor | Friction | Standard / Heuristic | Proposed Remediation | Verification |
|---|---|---|---|---|---|
| 1 **P0** | `CommandPalette` — `components/navigation/CommandPalette.tsx:27-32` | Both branches of `if (isOpen) onClose(); else onClose();` call `onClose`. No other ⌘K listener exists (`grep "'k'"` → only here). **The palette can only be opened by clicking the sidebar button, and the sidebar advertises ⌘K.** Also mobile has no trigger at all. | Nielsen #4 consistency; WCAG 2.1.1 | Lift the shortcut to `app/page.tsx`: `setIsCommandPaletteOpen(o => !o)`; also guard with `e.key.toLowerCase()==='k'`. Add a search icon button to the mobile bottom bar / Today header. | Given app loaded, When ⌘/Ctrl+K pressed, Then palette opens; pressed again, closes. |
| 2 **P0** | `CommandPalette` (same file) | Arrow keys advertised in footer ("Navigate with … arrow keys") but unimplemented; no `role="dialog"`, no combobox/listbox, no focus return, backdrop click doesn't close (`onClick` only stops propagation), commands are 5 hard-coded buttons, filter ignores commands. | WAI-ARIA dialog + combobox patterns; 2.1.1, 2.4.3, 4.1.2 | Rebuild as `role="dialog" aria-modal` + input `role="combobox" aria-expanded aria-controls aria-activedescendant` + `role="listbox"` of `role="option"`. Data-drive commands (`{id,label,keywords,shortcut,run}`), fuzzy filter all of them, ↑/↓/Home/End/Enter, Esc, restore focus to opener, backdrop click closes. | Axe: 0 violations; ↓↓Enter runs 3rd command; Esc returns focus to trigger. |
| 3 **P0** | Notes — `ReaderView.tsx:321-327` | `handleAddNoteFromSelection` uses `prompt()` then shows the note in an `alert()` — **the note is never saved**, though `lib/db` already has `saveNote/getNotesForBook/deleteNote` (`lib/db/index.ts:242-252`) and a `notes` table. | Data-loss; Nielsen #1/#9 | Replace with an inline note popover → `saveNote({id,bookId,chapterId,quote,text,createdAt})`. See Feature F1. | Given I add a note, When I reload and reopen the chapter, Then the note is listed. |
| 4 **P0** | Original PDF — `lib/pdf/extractor.ts:63-66` + `ReaderView.tsx:~417` | `pdfDataUrl = URL.createObjectURL(file)` is a **blob URL persisted into IndexedDB**. Blob URLs die with the document, so "Original PDF" shows a broken iframe after any reload. | Functional defect | Store the `Blob`/`ArrayBuffer` in Dexie (separate `files` table so `books` rows stay small) and create an object URL on open; revoke on unmount. Hide the toggle if no blob. | Upload, hard reload, toggle Original PDF → PDF renders. |
| 5 **P0** | Onboarding — `components/onboarding/OnboardingModal.tsx` | Component is never imported or rendered (grep confirms); the `pagewise_onboarded` flag is never read. New users get no tour. | Nielsen #10 help | Mount in `app/page.tsx` when `!localStorage.pagewise_onboarded` (wrapped in try/catch); convert to the shared `Dialog` (item 8). | Fresh profile shows tour once; Skip persists. |
| 6 **P1** | Theme — `app/page.tsx:42-54,130-133`; `CommandPalette` toggle | (a) Palette toggle only calls `setSettings` — **not persisted** (Settings page calls `updateAppSettings`). (b) `theme:'system'` is read once; no `matchMedia` change listener. (c) Theme applied in an effect after IndexedDB load → flash of light theme for dark users, and loading splash is light-only. | CLS/FOUC; consistency | Persist via `updateAppSettings`. Inline a tiny `<script>` in `app/layout.tsx` that sets `.dark` from `localStorage`/`matchMedia` before paint; mirror the setting to `localStorage`. Subscribe to `matchMedia('(prefers-color-scheme: dark)')`. | Dark-OS user: no light flash on reload; toggling in palette survives reload. |
| 7 **P1** | Focus visibility — repo-wide | `grep focus-visible` = 0. Many controls (`AppNavbar`, `ReviewSession`, `LibraryView` cards) have **no focus style at all**; inputs use `focus:outline-hidden` with at most a 1 px ring (`AssistantDrawer` input) or none (`CommandPalette`, Reader chapter `<select>` uses `focus:ring-0`). | WCAG 2.4.7, 2.4.11, 1.4.11 | Add one global rule in `app/globals.css`: `:where(a,button,[role=button],input,select,textarea,summary,[tabindex]):focus-visible{outline:2px solid var(--focus);outline-offset:2px}` with `--focus` ≥3:1 on both themes. Remove `focus:outline-hidden` / `focus:ring-0` or pair each with a visible replacement. Add `scroll-padding-top` equal to sticky header height for 2.4.11. | Tab through every screen: each stop has a ≥2 px ring; focused element never hidden under header/footer. |
| 8 **P1** | All modals/drawers — `UploadModal`, `OnboardingModal`, `AssistantDrawer`, quick-explain dialog in `ReaderView:~478`, `CommandPalette` | No `role="dialog"`, `aria-modal`, `aria-labelledby`; no focus trap or restoration; no Esc (except palette); icon-only close buttons have no accessible name; Tab leaks to the page behind. | 2.1.2, 2.4.3, 4.1.2 | Create `components/ui/Dialog.tsx` (native `<dialog>` + `showModal()` or a focus-trap hook). One primitive, used by all six. Add `aria-label="Close"` to every icon button. | Open modal → focus moves in; Tab cycles inside; Esc closes; focus returns to opener. |
| 9 **P1** | Clickable `div`s — `LibraryView.tsx` book card (`onClick` on `div`), `TodayView.tsx` due-cards tile and "other books" rows, `CardsView` equivalents, `AppNavbar` logo collapse toggle (`div onClick`) | Not focusable, not operable by keyboard, no role. | 2.1.1, 4.1.2 | Make the card a real `<button>`/`<a>`-style element (stretched-link pattern: title is the `<button>`, card uses `::after{inset:0}`), keep the ⋮ menu outside it. Logo toggle → `<button aria-label aria-expanded aria-controls>`. | Tab reaches every card; Enter opens it. |
| 10 **P1** | Contrast — project-wide | Computed: `text-stone-400` on white **2.52:1** and on `stone-50` 2.41:1 (fails 4.5:1) — used 129× for labels, captions, placeholders, dates; `text-stone-500` on dark `stone-900` **3.65:1**; white on `amber-500` badge (`AppNavbar` badge, `AssistantDrawer`) **2.15:1**; `emerald-600` on white 3.77:1 (goal ring text, `TodayView`); stone-400 on sepia `#f4ecd8` 2.14:1. | WCAG 1.4.3, 1.4.11 | Introduce semantic tokens (see §3.1) and replace: light `stone-400`→`stone-600` (7.6:1) for text, `stone-500` is the floor (4.8:1 on white, but 4.4:1 on `stone-100` — use `stone-600` there); dark `stone-500`→`stone-400` (6.9:1 on `stone-900`); badges `amber-700` bg + white or `amber-100`/`amber-900`; `emerald-700` for text. | Axe/Lighthouse contrast: 0 failures in light, dark, sepia. |
| 11 **P1** | Reader themes — `ReaderView.tsx:~296-306` | `sepia` and `dark` reader themes only recolor the page container; header/footer stay `bg-white/90` (or `dark:bg-stone-950`) and chapter text hard-codes `text-stone-900 dark:text-stone-100`, so sepia text is not sepia and `dark` reader theme in light OS mode has white chrome + light text colors fighting. | Visual consistency; 1.4.3 | Drive reader colors from CSS variables set on a `data-reader-theme` attribute (bg, fg, muted, rule, chrome). Header/footer/modes inherit. | Switch to sepia/dark: chrome, text, rules all change; contrast ≥4.5:1 each. |
| 12 **P1** | Reader progress — `ReaderView.tsx:~119-135` | `updateProgress` saves the **entire `Book` object** (including `coverDataUrl`/`pdfDataUrl`) on every chapter change; "% read" is `(chapterIndex+1)/n` → chapter 1 of 10 reads 10% immediately; scroll position is never stored, so resume always lands at chapter top; chapter change doesn't reset `activeMode`. | Perf; Nielsen #1 | Split cover/pdf out of `books`; use `db.books.update(id,{progress})`. Track in-chapter scroll fraction (rAF-throttled, saved on `visibilitychange`/unmount) → `percent = (idx + frac)/n`. Resume with `scrollTo`. | Read half of ch.3 of 10, reload → returns to same spot; Library shows ≈25%. |
| 13 **P1** | Selection menu — `ReaderView.tsx:handleMouseUp`, `SelectionMenu.tsx` | Triggered only on `mouseup`: **touch and keyboard selection never show the menu**. Menu is `position:fixed` from a one-time rect, so it detaches on scroll; no toolbar role, can overflow viewport edges, clicking a button can collapse the selection before handler runs; menu hidden to AT. | 2.1.1, 2.5.1; mobile parity | Listen to `selectionchange` (debounced) instead; clamp to viewport; `role="toolbar" aria-label="Selection actions"`; open via `Shift+F10`/hotkey `.` for keyboard users; on touch show as bottom sheet. | Long-press select on mobile → actions appear; keyboard select + hotkey opens menu. |
| 14 **P1** | Reader header at 320 px — `ReaderView.tsx:~330-420` | One flex row holds back button, title+select, "Original PDF" text button, full `TtsPlayer` (volume icon + play + 3 rate buttons), preferences, focus, "AI Study". At 320 px this cannot fit (**inferred, confirm with Playwright**). Icon buttons are `p-1`–`p-2` around 16 px icons ≈ 24–32 px (borderline 2.5.8). `title=` is the only label. | 2.5.8, 1.4.10 Reflow | Collapse secondary tools (PDF, TTS, prefs, focus) into a "⋯ Reader tools" menu below `sm`; keep Back + Mode switcher + AI. TTS becomes a bottom mini-player. Min hit area 44 px on touch via `min-h-11 min-w-11` or `before:` pseudo hit-slop. Add `aria-label` to all. | 320 px: no horizontal scroll; every target ≥24 px (44 px preferred). |
| 15 **P1** | Mode tabs — `ReaderView.tsx:~373,~420` | The 7 study modes are plain buttons: no `role="tablist"/tab`, no `aria-selected`, no arrow-key navigation, no `aria-controls`; mobile row scrolls horizontally with the active tab not scrolled into view. | 4.1.2; tabs pattern | Use roles + roving tabindex; ←/→/Home/End; `aria-controls` panel ids; `scrollIntoView({inline:'center'})` on change. Consider `1–7` number hotkeys. | Axe 0; ←/→ moves selection; panel labelled by tab. |
| 16 **P1** | Assistant drawer — `AssistantDrawer.tsx` | No streaming (waits for full JSON; spinner text only); no `aria-live` region so screen readers get nothing when the reply lands; full-screen overlay (`fixed inset-0`) hides the passage being discussed; send button & close have no accessible name; message list not `role="log"`; flashcard detection regexes `/(?:Front|Question|Q):.../` and `/(?:Back|Answer|A):.../` will match ordinary prose (`"A: …"`), producing false "Generated Flashcard Detected" cards; quiz JSON is extracted by a lazy regex `\{[\s\S]*?"question"…\}` that breaks on nested braces. | 4.1.3; correctness | Move structure out of regex: have `/api/generate` return `{text, card?, quiz?}` (the server already has zod schemas in `lib/ai/schemas.ts`). Stream via `ReadableStream`; render in `role="log" aria-live="polite" aria-relevant="additions"`; make it a docked side panel ≥1024 px (see F2). | Screen reader announces reply; prose containing "A:" no longer spawns a card. |
| 17 **P1** | Delete flows — `CardBrowser.tsx:38` (`confirm`), `SettingsView.tsx:329` (`confirm`), `LibraryView` | Native `confirm()` blocks the thread and can't be styled; Library's undo toast is not `role="status"`, shows a static "Undo (6s)" that doesn't count down, and is `fixed bottom-6` so it **overlaps the mobile bottom nav** (`z-40`, ~56 px tall). Dropdown ⋮ menu: no `role="menu"`, no Esc/outside-click/arrow keys; it also isn't dismissed on outside click. | 2.2.1 timing, 4.1.3 | Shared `Toast` (`role="status"`, pause on hover/focus, ≥ 8 s or until dismissed, offset `bottom: calc(env(safe-area-inset-bottom)+4.5rem)` below `md`). Replace `confirm()` with the `Dialog` + typed confirmation for "delete everything". Use real menu semantics. | Delete card → toast announced; Undo restores; doesn't cover nav. |
| 18 **P1** | Alerts — `UploadModal.tsx:47`, `ReaderView.tsx:318,325`, `TtsPlayer.tsx:44`, `SettingsView.tsx:124`, `app/page.tsx:114` | Seven `alert/confirm/prompt` calls for routine feedback. | Nielsen #1; non-blocking feedback | Replace with the Toast/Dialog primitives; "already in library" becomes a toast with "Open". | `grep -E '\b(alert|confirm|prompt)\('` → 0 hits. |
| 19 **P1** | Review session — `ReviewSession.tsx` | Window-level `keydown` handles Space/1–4/Z with no check for focused control → pressing Space on the focused "Show Answer"/rating button toggles twice or hijacks typing; no `aria-live` on revealed answer; rating colours (red/amber/blue/emerald) carry the meaning with 10 px text; the full-screen overlay has no `role="dialog"`; Exit has no confirm and loses nothing but gives no session summary; `updateCardReview(..., 3000)` records a **hard-coded 3000 ms** response time instead of measuring. | 2.1.4, 1.4.1; data integrity | Ignore events whose target is input/button; announce reveal via `aria-live="polite"`; measure real latency (`performance.now()` from card show); add a text label to each rating (already present) at ≥12 px; end-of-session summary (retention %, hardest cards, "review again"). | Space on focused button doesn't double-fire; stored `durationMs` varies. |
| 20 **P2** | Quick-explain modal — `ReaderView.tsx:~478-512` | Shows placeholder text "Analyzing selected passage..." in the same node as the result (abrupt swap, layout jump); no retry; non-streaming; error styled as title only; `whitespace-pre-line` instead of Markdown. | CLS; Nielsen #9 | Skeleton with reserved `min-h`, `aria-busy`, Markdown render, Retry/Copy, "Save as note" action. Prefer inline popover over modal. | CLS < 0.1 while loading; Retry works. |
| 21 **P2** | TTS — `TtsPlayer.tsx` | Silently truncates the chapter at 8000 chars (`slice(0, 8000)`); `speechSynthesis.onvoiceschanged` assigned without cleanup; rate change restarts from the beginning via `setTimeout(handlePlay,100)`; voice list loaded but no selector; no progress or sentence highlight; Chrome stops long utterances (~15 s) — one big utterance is fragile. | Reliability | Chunk by sentence/paragraph into a queue, highlight the current chunk, resume from chunk on rate/voice change, show "Listening 3/42". | Read a 30 k-char chapter end-to-end; rate change resumes mid-chapter. |
| 22 **P2** | Today view — `TodayView.tsx` | Daily quote is filler (5 hard-coded quotes, refresh button) occupying the top of the page; "Continue reading" uses `books[0]` (not "most recently opened"); "10-Pages-a-Day Principle" card is static copy; "Read 10 Pages Now" just opens the book (no 10-page tracking exists); weekly bar chart conveys goal state by colour only and tooltips appear on hover only; "View all" button opens `books[1]`, not the library; goal `<select>` is 11 px with no label; empty-streak state starts at "1 Day" by default. | Information hierarchy; 1.4.1 | Lead with one decision: "Review 12 cards (≈4 min)" or "Resume Ch.4 · 6 min". Replace quote + principle with a "Today's plan" (due cards → resume → goal). Chart: add `role="img"` + text summary / data table, pattern or value labels. Fix "View all" → `onTabChange('library')`. Sort by `lastOpenedAt`. | Today shows exactly one primary CTA; chart readable without colour. |
| 23 **P2** | Upload — `UploadModal.tsx` | Drop zone is a `div onClick` (not keyboard-activatable); progress is not `role="progressbar"` with `aria-valuenow`; processing state hides the Close button with no cancel; errors not `role="alert"`; file-size copy inconsistent. | 2.1.1, 4.1.2, 4.1.3 | Use `<label>`/`<button>` wrapping the hidden input; `role="progressbar"`; error `role="alert"`; add Cancel (AbortController around extraction); allow multi-file. | Keyboard-only upload works; screen reader hears progress. |
| 24 **P2** | Navigation — `AppNavbar.tsx` | `<nav>` ×2 without `aria-label`; active item lacks `aria-current="page"`; icon-only collapsed state relies on `title`; sidebar width animates via `transition-all` (layout thrash); badge count not announced; mobile bar overlays content without `padding-bottom: env(safe-area-inset-bottom)`; sidebar collapse state not persisted. | 4.1.2, perf | `aria-label="Primary"`, `aria-current`, visually-hidden "N cards due", animate `width` via `grid-template-columns` or just `transform` on a fixed-width rail; safe-area padding; persist collapse in `localStorage`. | Screen reader reads "Cards, 12 due, current page". |
| 25 **P2** | Settings — `SettingsView.tsx` (1,056 lines) | One long scroll holding AI providers, models, fallbacks, goals, theme, backup/import, danger zone; ≥25 `text-[10–11px]`; API key stored client-side (field is `type=password` but see backup toggle); 11 `useState` mirrors of settings. | Cognitive load; Hick's law | Split into sub-routes/tabs (AI · Reading · Data · Danger); sticky section nav; collapse model lists into an "Advanced" disclosure (`aria-expanded`); debounce autosave with "Saved" `aria-live`. | Each section ≤ one screen at 1024 px. |
| 26 **P2** | Cards/Library empty & loading | `app/page.tsx` shows a pulsing "P" until IndexedDB resolves, then content pops in (CLS); AI mode panels show skeletons (good) but with unreserved heights; no `error.tsx`/`loading.tsx`. | CLS < 0.1 | Skeleton layouts with fixed `min-height` equal to the loaded layout; add route-level error boundary with Retry. | Lighthouse CLS < 0.1 on cold load. |
| 27 **P2** | Metadata/PWA | `app/layout.tsx`: no `viewport`/`themeColor`, no `manifest`, no favicon; `<body suppressHydrationWarning>` masks theme mismatch. | Installability | Add `export const viewport = { themeColor: [...] }`, manifest, icons; remove the hydration suppressor once theme script exists. | Lighthouse PWA/installable. |

---

## 3. Responsive Fluidity & Motion System Guide

### 3.1 Design tokens (replace per-component colour pairs)

Add to `app/globals.css` (Tailwind 4 `@theme` + CSS variables). Raw `dark:` pairs appear on virtually every line today; tokens fix contrast once.

```css
:root {
  --bg: #fafaf9; --surface: #fff; --surface-2: #f5f5f4;
  --fg: #1c1917; --fg-muted: #57534e;   /* 7.6:1 on white — use for ALL secondary text */
  --line: #e7e5e4; --accent: #1c1917; --accent-fg: #fafaf9;
  --focus: #1d4ed8;                      /* ≥3:1 vs adjacent colours both themes */
  --danger: #b91c1c; --ok: #047857; --warn: #92400e;
}
.dark { --bg:#0c0a09; --surface:#1c1917; --surface-2:#292524;
  --fg:#fafaf9; --fg-muted:#a8a29e;     /* 6.9:1 on #1c1917 */
  --line:#292524; --accent:#fafaf9; --accent-fg:#1c1917; --focus:#93c5fd; }
[data-reader-theme=sepia] { --bg:#f4ecd8; --fg:#43302b; --fg-muted:#6b5a4f; }
```

Type scale (floor 12 px for chrome, 14 px for controls, 16–18 px reading): `--text-xs:.75rem; --text-sm:.875rem; --text-base:1rem`. Ban `text-[10px]`/`text-[11px]` via an ESLint `no-restricted-syntax` rule. Keep the serif reading face (it's the one distinctive choice here) and drop the drop-cap on `first-letter` when a chapter starts mid-sentence.

### 3.2 Breakpoint remediation (320 / 768 / 1024 / 1440)

| Width | Rule |
|---|---|
| **320** | No horizontal page scroll; reader header = Back · title · "⋯" · AI; mode tabs scroll with scroll-snap and `scrollIntoView` on select; all targets ≥44 px; bottom nav + toast offset by `env(safe-area-inset-bottom)`; cards grid stays `grid-cols-2` only if titles `line-clamp-2`, else 1 col. |
| **768** | Sidebar rail (icon-only, 72 px) rather than the 256 px sidebar that eats ~33 % of the screen; assistant becomes a **bottom sheet** (≤ 70 vh, drag handle + button alternative per 2.5.7). |
| **1024** | Full sidebar; reader shows persistent mode tabs; assistant docks as a **right split pane** (see F2), reader column shrinks, never overlays. |
| **1440** | Cap reading measure at 65–75 ch (`max-width: 70ch`) regardless of font-size; use the extra space for a notes/outline gutter rather than wider lines. Library grid `repeat(auto-fill, minmax(11rem,1fr))`. |

**Container queries.** Pagewise's cards (`Library`, `Today` tiles, review rating row) are placed in differently-sized parents; use `@container` instead of viewport `sm:`/`lg:` for: book card (stack cover/meta under 14 rem), rating buttons (2×2 under 20 rem), mode-tab labels (icon-only under 28 rem). Replace `h-screen`-style `min-h-screen` on mobile with `min-h-dvh`.

### 3.3 Motion tokens

```css
:root {
  --dur-instant: 90ms; --dur-fast: 150ms; --dur-base: 220ms; --dur-slow: 320ms;
  --ease-out: cubic-bezier(.2,.8,.2,1);       /* enter */
  --ease-in:  cubic-bezier(.4,0,1,1);         /* exit  */
  --ease-std: cubic-bezier(.4,0,.2,1);
}
@media (prefers-reduced-motion: reduce) {
  *,*::before,*::after { animation-duration:.01ms!important; animation-iteration-count:1!important;
    transition-duration:.01ms!important; scroll-behavior:auto!important; }
}
```

Rules: animate only `transform` and `opacity`; never `transition-all`; progress bars use `transform: scaleX()` (origin left) instead of animating `width` (`ReaderView` slim bar, `Library` cards, `UploadModal`, `ReviewSession`); sidebar collapse uses a fixed-width rail + `translateX`; page transitions in `app/page.tsx` keep the existing `motion` fade but wrap in `useReducedMotion()` (→ opacity only, 0 ms `y`); `window.scrollTo({behavior:'smooth'})` (`ReaderView:~188,196`) must honour reduced motion; `canvas-confetti` in `ReviewSession` needs `disableForReducedMotion: true`; `animate-spin`/`animate-pulse` loaders swap to static text under reduced-motion. Haptic-feeling micro-interactions worth keeping: rating button press (`scale(.97)` 90 ms), card flip via `rotateY` (compositor-only), toast slide.

### 3.4 Layout-shift guidelines (target CLS < 0.1) and test plan

1. Reserve space for every async region: AI mode panels get `min-height` equal to a typical loaded panel; skeleton rows match final line-height.
2. Streaming text goes into a fixed-width container; auto-scroll only if the user is within 80 px of the bottom (otherwise show "↓ New" chip) — the current `scrollIntoView` on every message yanks users who scrolled up.
3. `Image`s: reserve `aspect-[3/4]` (already done for covers) and add `width/height` for `<img>`.
4. Fonts: use `next/font` with `display: swap` + `size-adjust` for the serif face.
5. Splash → content: keep the app shell (nav) rendered immediately; only the main pane skeletons.
6. **Verification (not yet done):** add a Playwright script (Chromium is preinstalled) that loads each route at 320/768/1024/1440, asserts `document.scrollingElement.scrollWidth <= innerWidth`, collects `PerformanceObserver('layout-shift')`, and runs `@axe-core/playwright`. Treat my 320 px findings as hypotheses until this passes.

---

## 4. Net-New UI Feature Specifications

Existing features, honestly assessed: the study *content* modes (Summary/Key Ideas/Lessons/Cards/Quiz/Glossary) are generate-and-read screens with the same shape ×6; they are *tabs of generated text*, not a study workflow. The highest-value additions are the ones that connect reading → capture → recall.

### F1 — Persistent Highlights & Notes Margin ("Annotations")

**Rationale.** Today the "Note" action discards input (Matrix #3) and "Make Card" fires an `alert`. Readwise Reader treats highlights/notes as the core object that resurfaces and is keyboard-operable ([Reader docs](https://blog.readwise.io/p/bf87944f-b0fe-4f08-a461-f75ab8aded6a/)); RemNote's strength is one shortcut turning text into a card linked to its source ([RemNote](https://www.remnote.com/blog/anki-vs-quizlet-vs-remnote)).

**Interaction & layout.**
- *Desktop:* select text → inline toolbar (Highlight ▾ colour · Note · Card · Ask AI · Explain). Highlight renders as `<mark data-hl-id>`; a right gutter (≥1280 px) lists notes aligned to their passage; clicking scrolls & pulses. *Mobile:* selection opens a bottom sheet; "Annotations" lives in a sheet from the "⋯" menu.
- *State machine:* `idle → selecting → toolbarOpen → (highlighted | noting | carding) → saved | error`; `saved` is optimistic with Dexie write and rollback toast on failure.
- "Make Card" opens an inline editor pre-filled with an **AI-drafted question** (cloze or Q/A) rather than the generic "What is the significance of…" front; user edits → save → card carries `sourceHighlightId` for "jump to source" from the review screen.

**Accessibility.** Selection toolbar `role="toolbar"`; hotkeys `H` highlight, `N` note, `C` card, `E` explain, `Esc` dismiss; focus moves to the note textarea and returns to the selection start on close; highlights are `<mark>` with a text style (underline) in addition to colour; gutter is `<aside aria-label="Annotations">` with a list, each item a button.

**Touchpoints.** `lib/db/types.ts` (`Highlight` {id, bookId, chapterId, startOffset, endOffset, quote, color, noteId?}), Dexie version 2 store `highlights: 'id, bookId, chapterId, createdAt'`; reuse existing `Note` helpers; new `components/reader/AnnotationLayer.tsx`, `AnnotationGutter.tsx`; refactor `SelectionMenu.tsx`; offsets computed against the output of `formatChapterParagraphs` (memoise it — currently recomputed every render).

**Acceptance.**
```
Given a chapter in Read mode
When I select a sentence and press H
Then it is highlighted, persisted, and still highlighted after reload

Given a highlight exists
When I press N and type "why?" then Ctrl+Enter
Then the note is saved, shown in the gutter, and no alert/prompt is shown

Given the note save fails (IndexedDB quota)
When I save
Then an error toast appears, the highlight remains, and the draft text is retained

Given a 320 px viewport
When I long-press to select
Then a bottom sheet with Highlight/Note/Card/Explain appears with ≥44 px targets
```

### F2 — Docked, Grounded Assistant ("Ask the page")

**Rationale.** NotebookLM's differentiator is inline, clickable citations and a side-by-side source/chat layout ([UChicago](https://academictech.uchicago.edu/2026/04/06/google-notebooklm-an-ai-tool-for-research-and-studying/)); Reader's Ghostreader works at word/paragraph/section/document scope. Pagewise's drawer covers the text and returns uncited prose.

**Interaction.** ≥1024 px: right split pane (resizable, 320–480 px, keyboard-resizable splitter `role="separator"` ←/→). <1024 px: bottom sheet with snap points (peek/half/full). Scope chips: *Selection · Paragraph · Chapter · Book*. The server returns `{text, citations:[{chapterId, quote, startOffset}], card?, quiz?}`; citation chips scroll/pulse the passage. Streaming render; "Stop" button. State machine: `empty → sending → streaming → done | error(retry)`; failed sends keep the draft.

**Accessibility.** `role="complementary"` (docked) / `role="dialog"` (sheet); transcript `role="log" aria-live="polite"`; `Ctrl/⌘+J` toggles (already exists), `Esc` returns focus to the reader at the previous selection; citation chips are buttons with `aria-label="Jump to quote in chapter 3"`.

**Touchpoints.** `components/assistant/AssistantDrawer.tsx` → `AssistantPanel.tsx`; `app/api/generate/route.ts` (`chat_assistant` kind → streaming + schema from `lib/ai/schemas.ts`); `lib/ai/prompts.ts`; new `useSplitPane` hook.

**Acceptance.**
```
Given the assistant is docked at 1280 px
When I ask a question
Then the reader text remains visible and scrollable, and tokens stream in without layout shift

Given an answer with two citations
When I activate the first citation chip via keyboard
Then the cited passage scrolls into view and is highlighted for 1.5 s (no animation under reduced-motion)

Given the model response contains the text "A: sometimes"
When rendered
Then no flashcard widget appears (structured card only)

Given a network failure mid-stream
When the stream errors
Then partial text is kept, an inline Retry appears, and the draft is not lost
```

### F3 — Real Command Menu with Actions & Shortcut Help

**Rationale.** Reader's palette contains "virtually any action" and doubles as shortcut discovery ([Reader docs](https://blog.readwise.io/p/bf87944f-b0fe-4f08-a461-f75ab8aded6a/)). Pagewise's palette is broken (Matrix #1–2) and navigation-only.

**Interaction.** ⌘/Ctrl+K from anywhere (and a mobile search button). Contextual sections: *Go to* · *Books* · *Chapters of current book* · *Actions* (Start review, Generate summary/quiz for this chapter, Add book, Toggle theme, Focus mode, Read aloud, Highlight selection) · *Settings*. Shows the shortcut beside each action; `?` opens a shortcut sheet. Recent items first; fuzzy matching; empty state with suggestions; "No results — Ask AI about “…”" fallback.

**Accessibility.** Combobox/listbox pattern (Matrix #2), `aria-activedescendant`, results count announced via `aria-live="polite"`, `Esc` closes and restores focus.

**Touchpoints.** `components/navigation/CommandPalette.tsx`; new `lib/commands/registry.ts` (commands register themselves from `ReaderView`, `CardsView`, etc. via a small context); `app/page.tsx` owns open state and the global hotkey.

**Acceptance.**
```
Given I'm anywhere in the app
When I press Ctrl+K
Then the palette opens with focus in the input and "Go to" results listed

Given the Reader is open on Chapter 2
When I type "ch 5" and press Enter
Then the reader jumps to Chapter 5 and the palette closes

Given I type "zzzz"
When no commands match
Then I see "No results" and an "Ask the assistant" option

Given the palette is open
When I press Esc
Then focus returns to the element that had it before opening
```

### F4 — "Today's Plan" Session Runner (review + read in one flow)

**Rationale.** The Today screen is decoration (quote + principle card). Study apps win on a single obvious next action and a satisfying session close; Anki is criticised as dated while RemNote/Quizlet win on polish ([RemNote](https://www.remnote.com/blog/anki-vs-quizlet-vs-remnote)). *(Vendor source — treat as directional.)*

**Interaction.** Today shows one card: "~12 min · 14 cards due → resume Ch.4 (≈6 min) → 1 quiz". "Start" runs a queue with a persistent top progress bar (scaleX), then a **session summary** (cards reviewed, retention %, minutes read, streak, hardest 3 cards with "Fix card" edit, "Add 5 more"). Interruption-safe: leaving mid-session saves queue position. States: `planned → running(step i/n) → paused → summary`.

**Accessibility.** Plan is an ordered list; step changes announced via `aria-live`; undo (`Z`) retained; no gesture-only actions; timer is optional.

**Touchpoints.** `components/today/TodayView.tsx`, `components/cards/ReviewSession.tsx` (extract `ReviewCard` + keep keyboard map but scope it to the dialog), `lib/study/ledger.ts`, `lib/habit/streak.ts`; real latency capture for FSRS logs.

**Acceptance.**
```
Given 14 cards are due and a book is in progress
When I open Today
Then exactly one primary "Start today's plan" button is shown with time estimate

Given I'm mid-review
When I close the tab and reopen
Then I'm offered "Resume session (card 7/14)"

Given I finish the queue
When the summary appears
Then it lists accurate counts from review logs and focus lands on the summary heading

Given prefers-reduced-motion
When the summary opens
Then no confetti or motion plays
```

### F5 — Reader Outline & Progress Rail (position-accurate reading)

**Rationale.** Chapter-only progress produces misleading "% read" and no resume point (Matrix #12); position-based progress is what readers expect ([sync discussion](https://www.svartling.net/2024/11/how-to-sync-reading-progress-between.html)).

**Interaction.** A collapsible left outline (chapters with per-chapter read %, ✓ when finished, dot for "has cards/notes"); a slim vertical progress rail with ticks for highlights; "Resume where you left off" toast on open; a "mark chapter complete" action that offers "Generate cards from this chapter?" (one-tap into the Cards mode). Mobile: outline is a bottom sheet from the chapter title.

**Accessibility.** Outline is `<nav aria-label="Chapters">` with `aria-current="location"`; progress uses `role="progressbar"`; rail is decorative-hidden but equivalent text "Chapter 3, 42 %" is in the header.

**Touchpoints.** `ReaderView.tsx` (replace `<select>`), new `ChapterOutline.tsx`, `lib/db/types.ts` (`progress.scrollFraction`, per-chapter `readFraction`), `lib/db/index.ts` (`db.books.update`).

**Acceptance.**
```
Given I read 60% of Chapter 2
When I reopen the book
Then it opens at that scroll position and the outline shows Ch.2 ≈60%

Given I mark Chapter 2 complete
When the prompt appears
Then "Generate cards" navigates to Cards mode for Chapter 2

Given a 320 px viewport
When I tap the chapter title
Then a bottom sheet outline opens, is dismissible by Esc/button, and traps focus
```

---

## 5. Suggested Execution Order

1. **Day 1 (P0 correctness):** palette hotkey (#1), persist notes (#3), blob-URL PDF (#4), mount onboarding (#5), theme persist + pre-paint script (#6).
2. **Week 1 (a11y foundation):** global `:focus-visible` (#7), `Dialog`/`Toast` primitives (#8, #17, #18), tokens + contrast (#10, §3.1), clickable-div fixes (#9), tabs/nav semantics (#15, #24).
3. **Week 2 (reader & motion):** progress/scroll (#12), selection on touch (#13), header collapse (#14), reduced-motion + transform-only (§3.3), CLS fixes (§3.4).
4. **Then features:** F3 → F1 → F5 → F2 → F4. Add the Playwright+axe suite from §3.4 *first* so each step has a regression gate.

*Generated by static analysis; runtime verification pending.*

---

## 6. Implementation Status (verified)

Implemented on this branch and checked in a real Chromium (Playwright) at 1280/1024/800/320 px, light and dark:

- **axe-core (WCAG 2.2 A/AA): 0 violations** on Today, Library, Cards, Settings, Reader and Reader + Assistant — 24 combinations. No horizontal overflow at any width.
- `eslint`, `tsc --noEmit` and `next build` all pass. Baseline lint had 7 errors; now 0.
- Matrix fixes landed: #1–#2 (working ⌘K combobox menu), #3 (notes/highlights persisted), #4 (PDF stored as Blob), #5 (onboarding mounted), #6 (theme persisted, pre-paint script, system listener), #7 (global `:focus-visible`), #8 (shared `Dialog`), #9 (no clickable divs), #10 (contrast tokens), #11 (reader themes drive chrome), #12 (scroll-position progress, partial writes), #13 (touch/keyboard selection), #14 (mobile header collapse), #15 (tabs semantics), #16 (assistant `role="log"`, structured parsing, docked pane), #17–#18 (Toast/ConfirmDialog replace every `alert/confirm/prompt`), #19 (review: real latency, key handling, summary), #21 (chunked TTS), #22 (Today's plan), #23 (upload a11y + cancel), #24 (nav semantics).
- Features: F1 (highlights + notes + editable/AI-drafted cards), F3 (command menu + `?` shortcuts), F4 (Today's plan + session summary), F5 (chapter outline with per-chapter progress), F2 (assistant docks as a split pane ≥1024 px).
- Code is modularised: every source file is ≤ 375 lines (reader, assistant and settings split into hooks and sub-components).

Not done: citations in assistant answers (needs server-side schema change), streaming responses, settings sub-navigation, PWA manifest/icons, resumable review queue.
