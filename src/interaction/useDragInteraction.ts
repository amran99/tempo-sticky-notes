import { useCallback, useEffect, useRef } from 'react';
import type { Delta, Point } from './geometry';

interface DragCallbacks {
  onFrame: (delta: Delta, point: Point) => void;
  onCommit: (delta: Delta, point: Point) => void;
  onCancel: () => void;
}

/**
 * Shared pointer lifecycle for move/resize/draw-to-create. pointermove only records
 * the latest delta into a ref; a single requestAnimationFrame per interaction applies
 * it, batching however many move events fire within one frame into one DOM write
 * (done by the caller's onFrame). pointerup reads its own event coordinates rather
 * than the last pointermove's, since a move isn't guaranteed to have fired at the
 * exact release point. pointercancel and lostpointercapture (capture revoked without
 * an explicit cancel, e.g. by the browser) both abort with no commit.
 */
export function useDragInteraction({ onFrame, onCommit, onCancel }: DragCallbacks) {
  const startRef = useRef<Point | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const lastDeltaRef = useRef<Delta>({ dx: 0, dy: 0 });
  const rafRef = useRef<number | null>(null);

  const deltaAndPointFromEvent = useCallback((e: { clientX: number; clientY: number }): { delta: Delta; point: Point } => {
    const start = startRef.current;
    if (!start) return { delta: { dx: 0, dy: 0 }, point: { x: e.clientX, y: e.clientY } };
    return {
      delta: { dx: e.clientX - start.x, dy: e.clientY - start.y },
      point: { x: e.clientX, y: e.clientY },
    };
  }, []);

  const scheduleFrame = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const start = startRef.current;
      if (!start) return;
      const delta = lastDeltaRef.current;
      onFrame(delta, { x: start.x + delta.dx, y: start.y + delta.dy });
    });
  }, [onFrame]);

  const cancelFrame = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cancelFrame();
    startRef.current = null;
    activePointerIdRef.current = null;
  }, [cancelFrame]);

  // Cancels any pending rAF if the component using this hook unmounts mid-
  // interaction (e.g. the note it's wired to is deleted via the keyboard while
  // being dragged). Without this, a frame already scheduled by onPointerMove
  // keeps firing after unmount, calling onFrame with stale closures over props
  // (geometry getters, dispatch) that no longer correspond to anything on screen.
  useEffect(() => () => cancelFrame(), [cancelFrame]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Primary button only (mouse secondary/auxiliary buttons report 1/2; touch
    // and pen contacts always report 0, so this never rejects them).
    if (e.button !== 0) return;
    // An interaction is already active for a different pointer - ignore this
    // one rather than silently hijacking it (which would reset the start
    // position to the new pointer and strand the original pointer's future
    // move/up events, since activePointerIdRef would no longer match them).
    if (startRef.current !== null) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    startRef.current = { x: e.clientX, y: e.clientY };
    lastDeltaRef.current = { dx: 0, dy: 0 };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (activePointerIdRef.current !== e.pointerId || !startRef.current) return;
    lastDeltaRef.current = deltaAndPointFromEvent(e).delta;
    scheduleFrame();
  }, [deltaAndPointFromEvent, scheduleFrame]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (activePointerIdRef.current !== e.pointerId || !startRef.current) return;
    const { delta, point } = deltaAndPointFromEvent(e);
    const target = e.target as Element;
    reset();
    if (target.hasPointerCapture?.(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }
    onCommit(delta, point);
  }, [deltaAndPointFromEvent, reset, onCommit]);

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    if (activePointerIdRef.current !== e.pointerId || !startRef.current) return;
    reset();
    onCancel();
  }, [reset, onCancel]);

  const onLostPointerCapture = useCallback((e: React.PointerEvent) => {
    // Fires on our own releasePointerCapture call too, but by then reset() has
    // already cleared startRef/activePointerIdRef, so this guard makes it a no-op
    // in that case and only reacts to capture being lost unexpectedly.
    if (activePointerIdRef.current !== e.pointerId || !startRef.current) return;
    reset();
    onCancel();
  }, [reset, onCancel]);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture };
}
