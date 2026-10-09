import type { NotesState, NotesAction } from '../types';
import { clamp, MIN_WIDTH, MIN_HEIGHT } from '../interaction/geometry';

export const initialState: NotesState = { notes: [], nextZIndex: 1 };

export function notesReducer(state: NotesState, action: NotesAction): NotesState {
  switch (action.type) {
    case 'ADD': {
      const note = { ...action.note, zIndex: state.nextZIndex };
      return { notes: [...state.notes, note], nextZIndex: state.nextZIndex + 1 };
    }
    case 'MOVE':
      return {
        ...state,
        notes: state.notes.map((n) => (n.id === action.id ? { ...n, x: action.x, y: action.y } : n)),
      };
    case 'RESIZE':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.id ? { ...n, width: action.width, height: action.height } : n,
        ),
      };
    case 'DELETE':
      return { ...state, notes: state.notes.filter((n) => n.id !== action.id) };
    case 'SET_TEXT':
      return { ...state, notes: state.notes.map((n) => (n.id === action.id ? { ...n, text: action.text } : n)) };
    case 'SET_COLOR':
      return { ...state, notes: state.notes.map((n) => (n.id === action.id ? { ...n, color: action.color } : n)) };
    case 'BRING_TO_FRONT':
      return {
        notes: state.notes.map((n) => (n.id === action.id ? { ...n, zIndex: state.nextZIndex } : n)),
        nextZIndex: state.nextZIndex + 1,
      };
    case 'LOAD': {
      const maxZ = action.notes.reduce((max, n) => Math.max(max, n.zIndex), 0);
      return { notes: action.notes, nextZIndex: maxZ + 1 };
    }
    case 'CLAMP_TO_CANVAS': {
      // Repositions (and, only if truly necessary, shrinks) any note that falls
      // outside the current canvas - covers both a live window resize and notes
      // restored from localStorage after being created at a larger viewport.
      // Keeps the same note/state references when nothing actually needs to
      // move, since this can fire on every resize tick.
      const canvasWidth = action.width;
      const canvasHeight = action.height;
      let changed = false;
      const notes = state.notes.map((n) => {
        const width = Math.min(n.width, Math.max(MIN_WIDTH, canvasWidth));
        const height = Math.min(n.height, Math.max(MIN_HEIGHT, canvasHeight));
        const x = clamp(n.x, 0, Math.max(0, canvasWidth - width));
        const y = clamp(n.y, 0, Math.max(0, canvasHeight - height));
        if (x === n.x && y === n.y && width === n.width && height === n.height) return n;
        changed = true;
        return { ...n, x, y, width, height };
      });
      return changed ? { ...state, notes } : state;
    }
    default:
      return state;
  }
}
