import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { Note, NotesAction } from '../../types';
import type { Point, Rect } from '../../interaction/geometry';
import {
  computeMovePosition,
  computeResizeDimensions,
  overlapFraction,
  DELETE_OVERLAP_THRESHOLD,
} from '../../interaction/geometry';
import { useDragInteraction } from '../../interaction/useDragInteraction';
import { ResizeHandle } from './ResizeHandle';
import styles from './StickyNote.module.css';

interface StickyNoteProps {
  note: Note;
  dispatch: Dispatch<NotesAction>;
  getCanvasRect: () => Rect;
  getCanvasOrigin: () => Point;
  getTrashRect: () => Rect;
  setTrashArmed: (armed: boolean) => void;
  setDragActive: (active: boolean) => void;
  autoFocus: boolean;
  onAutoFocusConsumed: () => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function StickyNoteImpl({
  note,
  dispatch,
  getCanvasRect,
  getCanvasOrigin,
  getTrashRect,
  setTrashArmed,
  setDragActive,
  autoFocus,
  onAutoFocusConsumed,
  isSelected,
  onSelect,
}: StickyNoteProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Purely cosmetic (elevated shadow + slight lift) while a move or resize is in
  // progress; never read by the interaction/geometry logic itself.
  const [isInteracting, setIsInteracting] = useState(false);
  // Tracks whether the textarea itself currently has focus, so the note-level
  // "selected" ring can step aside while the textarea's own focus ring is showing
  // instead of stacking two rings on top of each other.
  const [isTextFocused, setIsTextFocused] = useState(false);

  // Clears any leftover drag transform exactly when the committed position lands,
  // so there's never a frame showing neither the in-progress drag nor the new spot.
  useLayoutEffect(() => {
    if (rootRef.current) rootRef.current.style.transform = '';
  }, [note.x, note.y]);

  // Unlike transform, width/height ARE part of React's declarative style prop below,
  // so React's own re-render after a committed RESIZE already sets the correct pixel
  // values in the same commit — no separate reconciliation effect needed here.

  // Focuses this note's text once, right after it's drawn, then tells Board to
  // clear the request so it never re-fires on a later unrelated re-render (and
  // never fires at all for moved/resized/restored notes, which don't set it).
  useEffect(() => {
    if (!autoFocus) return;
    textareaRef.current?.focus();
    onAutoFocusConsumed();
  }, [autoFocus, onAutoFocusConsumed]);

  // Converts this note's live (possibly still-dragging) rect, in canvas-local
  // coordinates, into viewport coordinates, to compare against the trash zone's
  // rect (which getTrashRect reports in viewport coordinates since it's
  // position: fixed). Used identically for the live "armed" highlight and the
  // final delete decision, so both agree on exactly the same geometry.
  const isOverTrash = (livePos: Point): boolean => {
    const origin = getCanvasOrigin();
    const noteRect: Rect = { x: origin.x + livePos.x, y: origin.y + livePos.y, width: note.width, height: note.height };
    return overlapFraction(noteRect, getTrashRect()) >= DELETE_OVERLAP_THRESHOLD;
  };

  const move = useDragInteraction({
    onFrame: (delta) => {
      const startRect: Rect = { x: note.x, y: note.y, width: note.width, height: note.height };
      const pos = computeMovePosition(startRect, delta, getCanvasRect());
      if (rootRef.current) {
        rootRef.current.style.transform = `translate(${pos.x - note.x}px, ${pos.y - note.y}px)`;
      }
      setTrashArmed(isOverTrash(pos));
    },
    onCommit: (delta) => {
      setTrashArmed(false);
      setDragActive(false);
      setIsInteracting(false);
      const startRect: Rect = { x: note.x, y: note.y, width: note.width, height: note.height };
      const pos = computeMovePosition(startRect, delta, getCanvasRect());
      // Deletion is decided by the same note-vs-trash overlap test used for the
      // live "armed" highlight, not by where the pointer itself is.
      if (isOverTrash(pos)) {
        dispatch({ type: 'DELETE', id: note.id });
        return;
      }
      dispatch({ type: 'MOVE', id: note.id, x: pos.x, y: pos.y });
    },
    onCancel: () => {
      setTrashArmed(false);
      setDragActive(false);
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
      className={`${styles.note} ${isInteracting ? styles.interacting : ''} ${isSelected && !isTextFocused ? styles.selected : ''}`}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        backgroundColor: note.color,
        zIndex: note.zIndex,
      }}
      onPointerDown={() => {
        dispatch({ type: 'BRING_TO_FRONT', id: note.id });
        onSelect(note.id);
      }}
    >
      <div
        className={styles.header}
        onPointerDown={(e) => {
          setIsInteracting(true);
          setDragActive(true);
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
        ref={textareaRef}
        className={styles.body}
        value={note.text}
        placeholder="Type a note…"
        onChange={(e) => dispatch({ type: 'SET_TEXT', id: note.id, text: e.target.value })}
        onPointerDown={(e) => {
          // Let clicking into the text still bring the note to front/select it,
          // without also starting the header's drag path (the outer div's
          // pointerdown would otherwise fight text selection/cursor placement here).
          e.stopPropagation();
          dispatch({ type: 'BRING_TO_FRONT', id: note.id });
          onSelect(note.id);
        }}
        onFocus={() => setIsTextFocused(true)}
        onBlur={() => setIsTextFocused(false)}
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
