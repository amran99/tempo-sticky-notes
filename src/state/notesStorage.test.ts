import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadNotes, saveNotes, loadInitialState } from './notesStorage';
import type { Note } from '../types';

const validNote: Note = {
  id: 'a', x: 1, y: 2, width: 100, height: 80, text: 'hi', color: '#fef08a', zIndex: 1,
};

function mockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
  return store;
}

describe('notesStorage', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('loadNotes returns [] when nothing is stored', () => {
    expect(loadNotes()).toEqual([]);
  });

  it('saveNotes then loadNotes round-trips valid notes', () => {
    saveNotes([validNote]);
    expect(loadNotes()).toEqual([validNote]);
  });

  it('loadNotes falls back to [] for invalid JSON', () => {
    localStorage.setItem('sticky-notes', '{not json');
    expect(loadNotes()).toEqual([]);
  });

  it('loadNotes falls back to [] when the stored value is not an array', () => {
    localStorage.setItem('sticky-notes', JSON.stringify({ not: 'an array' }));
    expect(loadNotes()).toEqual([]);
  });

  it('loadNotes drops entries with wrong field types but keeps valid siblings', () => {
    localStorage.setItem(
      'sticky-notes',
      JSON.stringify([validNote, { ...validNote, id: 'b', width: 'not a number' }]),
    );
    expect(loadNotes()).toEqual([validNote]);
  });

  it('loadNotes drops entries missing required fields', () => {
    localStorage.setItem('sticky-notes', JSON.stringify([{ id: 'a' }]));
    expect(loadNotes()).toEqual([]);
  });

  it('loadInitialState derives nextZIndex from the highest stored zIndex', () => {
    saveNotes([validNote, { ...validNote, id: 'b', zIndex: 7 }]);
    const state = loadInitialState();
    expect(state.notes).toHaveLength(2);
    expect(state.nextZIndex).toBe(8);
  });

  it('loadInitialState returns nextZIndex 1 when storage is empty', () => {
    expect(loadInitialState()).toEqual({ notes: [], nextZIndex: 1 });
  });

  it('saveNotes does not throw when localStorage.setItem fails (quota exceeded, private browsing, etc.)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('QuotaExceededError');
      },
      removeItem: () => {},
    });
    expect(() => saveNotes([validNote])).not.toThrow();
  });
});
