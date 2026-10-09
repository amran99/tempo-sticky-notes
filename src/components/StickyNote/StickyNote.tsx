import { memo, useEffect, useRef, useState } from 'react';
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
      // Clear the drag transform synchronously here rather than relying on a
      // re-render to do it: if the committed x/y come out numerically equal to
      // the note's current x/y (e.g. dragged out and back), the reducer still
      // produces a new object (so this component re-renders), but note.x/note.y
      // themselves don't change - a cleanup effect keyed on those values would
      // never fire, leaving the last intermediate drag transform stuck on the
      // DOM even though React believes the note is back at its original spot.
      if (rootRef.current) rootRef.current.style.transform = '';
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
      // Set the DOM to the exact committed size directly, rather than trusting
      // React's re-render to do it: width/height ARE part of the declarative
      // style prop, but React's diffing only touches a style property when its
      // value actually changes between renders. If the resized-then-released
      // size comes out numerically equal to the note's current width/height
      // (e.g. resized out and back), React sees no change in that style value
      // and never reapplies it, leaving the last intermediate imperative size
      // stuck on the DOM even though the note is meant to be back at its
      // original size.
      if (rootRef.current) {
        rootRef.current.style.width = `${size.width}px`;
        rootRef.current.style.height = `${size.height}px`;
      }
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
      className={`${styles.note} ${isInteracting ? styles.interacting : ''} ${isSelected ? styles.selected : ''}`}
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
        // Also select on focus (not just pointerdown) so tabbing into the text
        // with the keyboard shows the same selected-note ring - but without
        // bringing it to front, since keyboard focus traversal shouldn't reorder
        // note stacking the way an intentional click does.
        onFocus={() => onSelect(note.id)}
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
