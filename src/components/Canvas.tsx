import { forwardRef, useRef, useState } from 'react';
import type { Dispatch, RefObject } from 'react';
import type { Note, NotesAction } from '../types';
import type { Point, Rect } from '../interaction/geometry';
import { MIN_WIDTH, MIN_HEIGHT, clamp, normalizeRect, clampRectToCanvas } from '../interaction/geometry';
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
      const normalized = normalizeRect(origin, current);
      applyPreviewRect(clampRectToCanvas(normalized, getCanvasRect()));
    },
    onCommit: (_delta, point) => {
      const origin = originRef.current;
      setPreviewVisible(false);
      originRef.current = null;
      if (origin) {
        const canvas = getCanvasRect();
        const current = toCanvasLocal(point);
        const normalized = clampRectToCanvas(normalizeRect(origin, current), canvas);
        const width = clamp(normalized.width, MIN_WIDTH, Math.max(MIN_WIDTH, canvas.width - normalized.x));
        const height = clamp(normalized.height, MIN_HEIGHT, Math.max(MIN_HEIGHT, canvas.height - normalized.y));
        const id = crypto.randomUUID();
        dispatch({
          type: 'ADD',
          note: { id, x: normalized.x, y: normalized.y, width, height, text: '', color: pendingColor },
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
