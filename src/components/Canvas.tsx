import { forwardRef } from 'react';
import type { Dispatch, RefObject } from 'react';
import type { Note, NotesAction } from '../types';
import type { Rect } from '../interaction/geometry';
import { StickyNote } from './StickyNote/StickyNote';
import { TrashZone } from './TrashZone';
import styles from './Canvas.module.css';

interface CanvasProps {
  notes: Note[];
  dispatch: Dispatch<NotesAction>;
  trashArmed: boolean;
  trashRef: RefObject<HTMLDivElement | null>;
  getCanvasRect: () => Rect;
  getTrashRect: () => Rect;
  setTrashArmed: (armed: boolean) => void;
}

export const Canvas = forwardRef<HTMLDivElement, CanvasProps>(function Canvas(
  { notes, dispatch, trashArmed, trashRef, getCanvasRect, getTrashRect, setTrashArmed },
  ref,
) {
  return (
    <div ref={ref} className={styles.canvas}>
      {notes.map((note) => (
        <StickyNote
          key={note.id}
          note={note}
          dispatch={dispatch}
          getCanvasRect={getCanvasRect}
          getTrashRect={getTrashRect}
          setTrashArmed={setTrashArmed}
        />
      ))}
      <TrashZone ref={trashRef} armed={trashArmed} />
    </div>
  );
});
