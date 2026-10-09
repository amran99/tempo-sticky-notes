import type { Note, NotesState } from '../types';

const STORAGE_KEY = 'sticky-notes';

function isValidNote(value: unknown): value is Note {
  if (typeof value !== 'object' || value === null) return false;
  const n = value as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    typeof n.x === 'number' && Number.isFinite(n.x) &&
    typeof n.y === 'number' && Number.isFinite(n.y) &&
    typeof n.width === 'number' && Number.isFinite(n.width) && n.width > 0 &&
    typeof n.height === 'number' && Number.isFinite(n.height) && n.height > 0 &&
    typeof n.text === 'string' &&
    typeof n.color === 'string' &&
    typeof n.zIndex === 'number' && Number.isFinite(n.zIndex)
  );
}

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidNote);
  } catch {
    return [];
  }
}

export function saveNotes(notes: Note[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

/**
 * Builds the reducer's initial state synchronously from localStorage, for use as
 * useReducer's lazy-init argument — avoids a mount-time flash or an effect racing
 * with (and overwriting) freshly-loaded notes.
 */
export function loadInitialState(): NotesState {
  const notes = loadNotes();
  const maxZ = notes.reduce((max, n) => Math.max(max, n.zIndex), 0);
  return { notes, nextZIndex: maxZ + 1 };
}
