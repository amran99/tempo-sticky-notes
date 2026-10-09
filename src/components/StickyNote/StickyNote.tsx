import { memo, useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { Note, NotesAction } from '../../types';
import type { Rect } from '../../interaction/geometry';
import { computeMovePosition, computeResizeDimensions, isPointInRect } from '../../interaction/geometry';
import { useDragInteraction } from '../../interaction/useDragInteraction';
import { ResizeHandle } from './ResizeHandle';
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
  // Purely cosmetic (elevated shadow + slight lift) while a move or resize is in
  // progress; never read by the interaction/geometry logic itself.
  const [isInteracting, setIsInteracting] = useState(false);

  // Clears any leftover drag transform exactly when the committed position lands,
  // so there's never a frame showing neither the in-progress drag nor the new spot.
  useLayoutEffect(() => {
    if (rootRef.current) rootRef.current.style.transform = '';
  }, [note.x, note.y]);

  // Unlike transform, width/height ARE part of React's declarative style prop below,
  // so React's own re-render after a committed RESIZE already sets the correct pixel
  // values in the same commit — no separate reconciliation effect needed here.

  const move = useDragInteraction({
    onFrame: (delta, point) => {
      const startRect: Rect = { x: note.x, y: note.y, width: note.width, height: note.height };
      const pos = computeMovePosition(startRect, delta, getCanvasRect());
      if (rootRef.current) {
        rootRef.current.style.transform = `translate(${pos.x - note.x}px, ${pos.y - note.y}px)`;
      }
      setTrashArmed(isPointInRect(point, getTrashRect()));
    },
    onCommit: (delta, point) => {
      setTrashArmed(false);
      setIsInteracting(false);
      // Deletion is decided by where the pointer is actually released, not by
      // whether the note's rectangle overlaps the trash zone.
      if (isPointInRect(point, getTrashRect())) {
        dispatch({ type: 'DELETE', id: note.id });
        return;
      }
      const startRect: Rect = { x: note.x, y: note.y, width: note.width, height: note.height };
      const pos = computeMovePosition(startRect, delta, getCanvasRect());
      dispatch({ type: 'MOVE', id: note.id, x: pos.x, y: pos.y });
    },
    onCancel: () => {
      setTrashArmed(false);
      setIsInteracting(false);
      if (rootRef.current) rootRef.current.style.transform = '';
    },
  });

  const resize = useDragInteraction({
    onFrame: (delta) => {
      const startRect: Rect = { x: note.x, y: note.y, width: note.width, height: note.height };
      const size = computeResizeDimensions(startRect, delta, getCanvasRect());
      if (rootRef.current) {
        rootRef.current.style.width = `${size.width}px`;
        rootRef.current.style.height = `${size.height}px`;
      }
    },
    onCommit: (delta) => {
      setIsInteracting(false);
      const startRect: Rect = { x: note.x, y: note.y, width: note.width, height: note.height };
      const size = computeResizeDimensions(startRect, delta, getCanvasRect());
      dispatch({ type: 'RESIZE', id: note.id, width: size.width, height: size.height });
    },
    onCancel: () => {
      setIsInteracting(false);
      // Unlike move's transform (a pure additive offset), width/height here directly
      // overwrite the declarative style value, so reverting means restoring the
      // actual committed pixel size, not clearing to empty.
      if (rootRef.current) {
        rootRef.current.style.width = `${note.width}px`;
        rootRef.current.style.height = `${note.height}px`;
      }
    },
  });

  return (
    <div
      ref={rootRef}
      className={`${styles.note} ${isInteracting ? styles.interacting : ''}`}
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
        onPointerDown={(e) => {
          setIsInteracting(true);
          move.onPointerDown(e);
        }}
        onPointerMove={move.onPointerMove}
        onPointerUp={move.onPointerUp}
        onPointerCancel={move.onPointerCancel}
        onLostPointerCapture={move.onLostPointerCapture}
      >
        <span className={styles.grip} aria-hidden="true" />
      </div>
      <textarea
        className={styles.body}
        value={note.text}
        placeholder="Type a note…"
        onChange={(e) => dispatch({ type: 'SET_TEXT', id: note.id, text: e.target.value })}
        onPointerDown={(e) => {
          // Let clicking into the text still bring the note to front, without
          // also starting the header's drag path (the outer div's pointerdown
          // would otherwise fight text selection/cursor placement here).
          e.stopPropagation();
          dispatch({ type: 'BRING_TO_FRONT', id: note.id });
        }}
        aria-label="Note text"
      />
      <ResizeHandle
        onPointerDown={(e) => {
          setIsInteracting(true);
          resize.onPointerDown(e);
        }}
        onPointerMove={resize.onPointerMove}
        onPointerUp={resize.onPointerUp}
        onPointerCancel={resize.onPointerCancel}
        onLostPointerCapture={resize.onLostPointerCapture}
      />
    </div>
  );
}

export const StickyNote = memo(StickyNoteImpl);
