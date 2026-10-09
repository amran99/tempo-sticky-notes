import { memo, useLayoutEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import type { Note, NotesAction } from '../../types';
import type { Rect } from '../../interaction/geometry';
import { computeMovePosition, isPointInRect } from '../../interaction/geometry';
import { useDragInteraction } from '../../interaction/useDragInteraction';
import styles from './StickyNote.module.css';

interface StickyNoteProps {
  note: Note;
  dispatch: Dispatch<NotesAction>;
  getCanvasRect: () => Rect;
  getTrashRect: () => Rect;
  setTrashArmed: (armed: boolean) => void;
}

function StickyNoteImpl({ note, dispatch, getCanvasRect, getTrashRect, setTrashArmed }: StickyNoteProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Clears any leftover drag transform exactly when the committed position lands,
  // so there's never a frame showing neither the in-progress drag nor the new spot.
  useLayoutEffect(() => {
    if (rootRef.current) rootRef.current.style.transform = '';
  }, [note.x, note.y]);

  const move = useDragInteraction({
    onFrame: (delta, point) => {
      const startRect: Rect = { x: note.x, y: note.y, width: note.width, height: note.height };
      const pos = computeMovePosition(startRect, delta, getCanvasRect());
      if (rootRef.current) {
        rootRef.current.style.transform = `translate(${pos.x - note.x}px, ${pos.y - note.y}px)`;
      }
      setTrashArmed(isPointInRect(point, getTrashRect()));
    },
    onCommit: (delta) => {
      setTrashArmed(false);
      const startRect: Rect = { x: note.x, y: note.y, width: note.width, height: note.height };
      const pos = computeMovePosition(startRect, delta, getCanvasRect());
      dispatch({ type: 'MOVE', id: note.id, x: pos.x, y: pos.y });
    },
    onCancel: () => {
      setTrashArmed(false);
      if (rootRef.current) rootRef.current.style.transform = '';
    },
  });

  return (
    <div
      ref={rootRef}
      className={styles.note}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        backgroundColor: note.color,
        zIndex: note.zIndex,
      }}
      onPointerDown={() => dispatch({ type: 'BRING_TO_FRONT', id: note.id })}
    >
      <div
        className={styles.header}
        onPointerDown={move.onPointerDown}
        onPointerMove={move.onPointerMove}
        onPointerUp={move.onPointerUp}
        onPointerCancel={move.onPointerCancel}
        onLostPointerCapture={move.onLostPointerCapture}
      />
      <div className={styles.body}>{note.text}</div>
    </div>
  );
}

export const StickyNote = memo(StickyNoteImpl);
