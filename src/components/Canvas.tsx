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
  trashRef: RefObject<HTMLDivElement | null>;
  getCanvasRect: () => Rect;
  getTrashRect: () => Rect;
  setTrashArmed: (armed: boolean) => void;
  drawModeArmed: boolean;
  pendingColor: string;
  onCreated: () => void;
}

export const Canvas = forwardRef<HTMLDivElement, CanvasProps>(function Canvas(
  { notes, dispatch, trashArmed, trashRef, getCanvasRect, getTrashRect, setTrashArmed, drawModeArmed, pendingColor, onCreated },
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
        dispatch({
          type: 'ADD',
          note: { id: crypto.randomUUID(), x: normalized.x, y: normalized.y, width, height, text: '', color: pendingColor },
        });
        onCreated();
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
