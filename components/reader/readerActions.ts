import type { ReaderMode } from './readerModes';

/** Imperative reader actions, kept in a ref so shortcuts and the command menu always call the latest closures. */
export interface ReaderActions {
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  setMode: (mode: ReaderMode) => void;
  toggleFocus: () => void;
  exitFocus: () => void;
  toggleAssistant: () => void;
  openOutline: () => void;
  openNotes: () => void;
  openPrefs: () => void;
  togglePdf: () => void;
  /** Runs a selection shortcut (h/n/c/e/s); returns false if there is no selection. */
  selection: (key: string) => boolean;
}
