import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { notesReducer, initialState } from '../state/notesReducer';
import type { Rect } from '../interaction/geometry';
import { Canvas } from './Canvas';
import styles from './Board.module.css';

export function Board() {
  const [state, dispatch] = useReducer(notesReducer, initialState);
  const canvasRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const [trashArmed, setTrashArmed] = useState(false);
  const trashArmedRef = useRef(false);

  // Only triggers a re-render when the armed state actually flips, instead of on
  // every animation frame while a note is dragged over/near the trash zone.
  const setTrashArmedIfChanged = useCallback((armed: boolean) => {
    if (trashArmedRef.current === armed) return;
    trashArmedRef.current = armed;
    setTrashArmed(armed);
  }, []);

  const getCanvasRect = useCallback((): Rect => {
    const r = canvasRef.current?.getBoundingClientRect();
    return r ? { x: 0, y: 0, width: r.width, height: r.height } : { x: 0, y: 0, width: 0, height: 0 };
  }, []);

  const getTrashRect = useCallback((): Rect => {
    const r = trashRef.current?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : { x: 0, y: 0, width: 0, height: 0 };
  }, []);

  // Temporary: creation isn't wired yet, so seed one note to exercise move/resize
  // against. Removed once the create-by-draw interaction lands. Guarded against
  // StrictMode's dev-mode double-invocation so it doesn't seed two overlapping notes.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    dispatch({
      type: 'ADD',
      note: { id: crypto.randomUUID(), x: 100, y: 100, width: 160, height: 120, text: '', color: '#fef08a' },
    });
  }, []);

  return (
    <div className={styles.board}>
      <Canvas
        ref={canvasRef}
        notes={state.notes}
        dispatch={dispatch}
        trashArmed={trashArmed}
        trashRef={trashRef}
        getCanvasRect={getCanvasRect}
        getTrashRect={getTrashRect}
        setTrashArmed={setTrashArmedIfChanged}
      />
    </div>
  );
}
