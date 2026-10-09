import { useCallback, useReducer, useRef, useState } from 'react';
import { notesReducer, initialState } from '../state/notesReducer';
import type { Rect } from '../interaction/geometry';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import styles from './Board.module.css';

const DEFAULT_NOTE_COLOR = '#fef08a';

export function Board() {
  const [state, dispatch] = useReducer(notesReducer, initialState);
  const canvasRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const [trashArmed, setTrashArmed] = useState(false);
  const trashArmedRef = useRef(false);
  const [drawModeArmed, setDrawModeArmed] = useState(false);
  const [pendingColor] = useState(DEFAULT_NOTE_COLOR); // becomes a real picker once colors land

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

  return (
    <div className={styles.board}>
      <Toolbar drawModeArmed={drawModeArmed} onToggleDrawMode={() => setDrawModeArmed((v) => !v)} />
      <Canvas
        ref={canvasRef}
        notes={state.notes}
        dispatch={dispatch}
        trashArmed={trashArmed}
        trashRef={trashRef}
        getCanvasRect={getCanvasRect}
        getTrashRect={getTrashRect}
        setTrashArmed={setTrashArmedIfChanged}
        drawModeArmed={drawModeArmed}
        pendingColor={pendingColor}
        onCreated={() => setDrawModeArmed(false)}
      />
    </div>
  );
}
