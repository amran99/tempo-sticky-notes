import { describe, it, expect } from 'vitest';
import { notesReducer, initialState } from './notesReducer';
import type { Note } from '../types';

const baseNote: Omit<Note, 'zIndex'> = {
  id: 'a', x: 10, y: 10, width: 100, height: 80, text: '', color: '#fef08a',
};

describe('notesReducer', () => {
  it('ADD assigns an incrementing zIndex and appends the note', () => {
    const s1 = notesReducer(initialState, { type: 'ADD', note: baseNote });
    expect(s1.notes).toEqual([{ ...baseNote, zIndex: 1 }]);
    expect(s1.nextZIndex).toBe(2);
  });

  it('MOVE updates only the matching note, preserving sibling identity', () => {
    const s1 = notesReducer(initialState, { type: 'ADD', note: baseNote });
    const s2 = notesReducer(s1, { type: 'ADD', note: { ...baseNote, id: 'b' } });
    const s3 = notesReducer(s2, { type: 'MOVE', id: 'a', x: 50, y: 60 });
    expect(s3.notes[0]).toMatchObject({ x: 50, y: 60 });
    expect(s3.notes[1]).toBe(s2.notes[1]);
  });

  it('RESIZE updates width/height for the matching note', () => {
    const s1 = notesReducer(initialState, { type: 'ADD', note: baseNote });
    const s2 = notesReducer(s1, { type: 'RESIZE', id: 'a', width: 200, height: 150 });
    expect(s2.notes[0]).toMatchObject({ width: 200, height: 150 });
  });

  it('DELETE removes the matching note', () => {
    const s1 = notesReducer(initialState, { type: 'ADD', note: baseNote });
    const s2 = notesReducer(s1, { type: 'DELETE', id: 'a' });
    expect(s2.notes).toEqual([]);
  });

  it('SET_TEXT and SET_COLOR update their respective fields', () => {
    const s1 = notesReducer(initialState, { type: 'ADD', note: baseNote });
    const s2 = notesReducer(s1, { type: 'SET_TEXT', id: 'a', text: 'hello' });
    const s3 = notesReducer(s2, { type: 'SET_COLOR', id: 'a', color: '#bbf7d0' });
    expect(s3.notes[0]).toMatchObject({ text: 'hello', color: '#bbf7d0' });
  });

  it('BRING_TO_FRONT bumps the note above the current max and advances nextZIndex', () => {
    const s1 = notesReducer(initialState, { type: 'ADD', note: baseNote });
    const s2 = notesReducer(s1, { type: 'ADD', note: { ...baseNote, id: 'b' } });
    const s3 = notesReducer(s2, { type: 'BRING_TO_FRONT', id: 'a' });
    expect(s3.notes[0]?.zIndex).toBe(3);
    expect(s3.nextZIndex).toBe(4);
  });

  it('DELETE then BRING_TO_FRONT on the remaining note does not corrupt zIndex ordering', () => {
    const s1 = notesReducer(initialState, { type: 'ADD', note: baseNote });
    const s2 = notesReducer(s1, { type: 'ADD', note: { ...baseNote, id: 'b' } });
    const s3 = notesReducer(s2, { type: 'DELETE', id: 'a' });
    const s4 = notesReducer(s3, { type: 'BRING_TO_FRONT', id: 'b' });
    expect(s4.notes).toEqual([{ ...baseNote, id: 'b', zIndex: 3 }]);
  });

  it('LOAD replaces state and derives nextZIndex from the loaded notes', () => {
    const loaded: Note[] = [{ ...baseNote, zIndex: 5 }, { ...baseNote, id: 'b', zIndex: 2 }];
    const s1 = notesReducer(initialState, { type: 'LOAD', notes: loaded });
    expect(s1.notes).toEqual(loaded);
    expect(s1.nextZIndex).toBe(6);
  });

  describe('CLAMP_TO_CANVAS', () => {
    it('repositions a note loaded from a larger viewport back into a smaller canvas', () => {
      // Created at x=1800 on a wide screen; now viewed at the app's minimum
      // supported viewport (1024x768) - the exact "persisted at a larger
      // viewport" scenario.
      const loaded: Note[] = [{ id: 'a', x: 1800, y: 900, width: 200, height: 150, text: '', color: '#fef08a', zIndex: 1 }];
      const s1 = notesReducer(initialState, { type: 'LOAD', notes: loaded });
      const s2 = notesReducer(s1, { type: 'CLAMP_TO_CANVAS', width: 1024, height: 768 });
      const note = s2.notes[0]!;
      expect(note.x + note.width).toBeLessThanOrEqual(1024);
      expect(note.y + note.height).toBeLessThanOrEqual(768);
      expect(note.width).toBe(200); // repositioned, not shrunk - it still fits
      expect(note.height).toBe(150);
    });

    it('shrinks a note wider than the new canvas, not just repositions it', () => {
      const loaded: Note[] = [{ id: 'a', x: 0, y: 0, width: 1500, height: 150, text: '', color: '#fef08a', zIndex: 1 }];
      const s1 = notesReducer(initialState, { type: 'LOAD', notes: loaded });
      const s2 = notesReducer(s1, { type: 'CLAMP_TO_CANVAS', width: 1024, height: 768 });
      const note = s2.notes[0]!;
      expect(note.width).toBeLessThanOrEqual(1024);
      expect(note.x + note.width).toBeLessThanOrEqual(1024);
    });

    it('leaves an in-bounds note untouched, preserving its object reference', () => {
      const s1 = notesReducer(initialState, { type: 'ADD', note: baseNote });
      const s2 = notesReducer(s1, { type: 'CLAMP_TO_CANVAS', width: 1024, height: 768 });
      expect(s2.notes[0]).toBe(s1.notes[0]);
      expect(s2).toBe(s1); // whole state reference preserved when nothing changes
    });
  });
});
