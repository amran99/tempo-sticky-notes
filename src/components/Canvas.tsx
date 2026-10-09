import { forwardRef, useRef, useState } from 'react';
import type { Dispatch, RefObject } from 'react';
import type { Note, NotesAction } from '../types';
import type { Point, Rect } from '../interaction/geometry';
import { resolveCreateRect } from '../interaction/geometry';
import { useDragInteraction } from '../interaction/useDragInteraction';
import { StickyNote } from './StickyNote/StickyNote';
import { TrashZone } from './TrashZone';
import styles from './Canvas.module.css';

interface CanvasProps {
  notes: Note[];
  dispatch: Dispatch<NotesAction>;
  trashArmed: boolean;
  dragActive: boolean;
  trashRef: RefObject<HTMLDivElement | null>;
  getCanvasRect: () => Rect;
  getCanvasOrigin: () => Point;
  getTrashRect: () => Rect;
  setTrashArmed: (armed: boolean) => void;
  setDragActive: (active: boolean) => void;
  drawModeArmed: boolean;
  pendingColor: string;
  onCreated: (id: string) => void;
  autoFocusNoteId: string | null;
  onAutoFocusConsumed: () => void;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onDeselect: () => void;
}

export const Canvas = forwardRef<HTMLDivElement, CanvasProps>(function Canvas(
  {
    notes,
    dispatch,
    trashArmed,
    dragActive,
    trashRef,
    getCanvasRect,
    getCanvasOrigin,
    getTrashRect,
    setTrashArmed,
    setDragActive,
    drawModeArmed,
    pendingColor,
    onCreated,
    autoFocusNoteId,
    onAutoFocusConsumed,
    selectedNoteId,
    onSelectNote,
    onDeselect,
  },
  ref,
) {
  const previewRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<Point | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Converts a point from viewport/client coordinates (as pointer events report)
  // into canvas-local coordinates (as note x/y are stored), using the canvas's own
  // current bounding rect.
  const toCanvasLocal = (clientPoint: Point): Point => {
    const canvasEl = (ref as RefObject<HTMLDivElement | null>).current;
    const box = canvasEl?.getBoundingClientRect();
    return box ? { x: clientPoint.x - box.left, y: clientPoint.y - box.top } : clientPoint;
  };

  const applyPreviewRect = (rect: Rect) => {
    if (!previewRef.current) return;
    previewRef.current.style.left = `${rect.x}px`;
    previewRef.current.style.top = `${rect.y}px`;
    previewRef.current.style.width = `${rect.width}px`;
    previewRef.current.style.height = `${rect.height}px`;
  };

  const draw = useDragInteraction({
    onFrame: (_delta, point) => {
      const origin = originRef.current;
      if (!origin) return;
      const current = toCanvasLocal(point);
      // Same resolver as commit, so the live preview always matches what
      // releasing right now would actually create (minimum size enforced and
      // kept fully on-canvas even near an edge).
      applyPreviewRect(resolveCreateRect(origin, current, getCanvasRect()));
    },
    onCommit: (_delta, point) => {
      const origin = originRef.current;
      setPreviewVisible(false);
      originRef.current = null;
      if (origin) {
        const current = toCanvasLocal(point);
        const rect = resolveCreateRect(origin, current, getCanvasRect());
        const id = crypto.randomUUID();
        dispatch({
          type: 'ADD',
          note: { id, x: rect.x, y: rect.y, width: rect.width, height: rect.height, text: '', color: pendingColor },
        });
        onCreated(id);
      }
    },
    onCancel: () => {
      setPreviewVisible(false);
      originRef.current = null;
    },
  });

  const handleLayerPointerDown = (e: React.PointerEvent) => {
    originRef.current = toCanvasLocal({ x: e.clientX, y: e.clientY });
    applyPreviewRect({ ...originRef.current, width: 0, height: 0 });
    setPreviewVisible(true);
    draw.onPointerDown(e);
  };

  return (
    <div
      ref={ref}
      className={styles.canvas}
      onPointerDown={(e) => {
        // Only deselect for a click that lands directly on the canvas background,
        // not one that bubbled up from a note (which handles its own selection).
        if (e.target === e.currentTarget) onDeselect();
      }}
    >
      {notes.map((note) => (
        <StickyNote
          key={note.id}
          note={note}
          dispatch={dispatch}
          getCanvasRect={getCanvasRect}
          getCanvasOrigin={getCanvasOrigin}
          getTrashRect={getTrashRect}
          setTrashArmed={setTrashArmed}
          setDragActive={setDragActive}
          autoFocus={note.id === autoFocusNoteId}
          onAutoFocusConsumed={onAutoFocusConsumed}
          isSelected={note.id === selectedNoteId}
          onSelect={onSelectNote}
        />
      ))}
      <TrashZone ref={trashRef} armed={trashArmed} expanded={dragActive} />
      {drawModeArmed && (
        <div
          className={styles.drawLayer}
          onPointerDown={handleLayerPointerDown}
          onPointerMove={draw.onPointerMove}
          onPointerUp={draw.onPointerUp}
          onPointerCancel={draw.onPointerCancel}
          onLostPointerCapture={draw.onLostPointerCapture}
        >
          {previewVisible && <div ref={previewRef} className={styles.preview} />}
        </div>
      )}
    </div>
  );
});
