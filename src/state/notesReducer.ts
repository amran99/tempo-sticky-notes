import type { NotesState, NotesAction } from '../types';

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
    default:
      return state;
  }
}
