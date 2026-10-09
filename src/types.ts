export interface Note {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  zIndex: number;
}

export interface NotesState {
  notes: Note[];
  nextZIndex: number;
}

export type NotesAction =
  | { type: 'ADD'; note: Omit<Note, 'zIndex'> }
  | { type: 'MOVE'; id: string; x: number; y: number }
  | { type: 'RESIZE'; id: string; width: number; height: number }
  | { type: 'DELETE'; id: string }
  | { type: 'SET_TEXT'; id: string; text: string }
  | { type: 'SET_COLOR'; id: string; color: string }
  | { type: 'BRING_TO_FRONT'; id: string }
  | { type: 'LOAD'; notes: Note[] };
