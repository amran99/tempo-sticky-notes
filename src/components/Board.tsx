import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { notesReducer } from '../state/notesReducer';
import { loadInitialState, saveNotes } from '../state/notesStorage';
import type { Rect } from '../interaction/geometry';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import styles from './Board.module.css';

const DEFAULT_NOTE_COLOR = '#fef08a';

export function Board() {
  // Lazy-init reads localStorage synchronously, before first render, so there's
  // no mount-time flash and no risk of a later effect racing with (and
  // overwriting) freshly-loaded notes.
  const [state, dispatch] = useReducer(notesReducer, undefined, loadInitialState);
  const canvasRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const [trashArmed, setTrashArmed] = useState(false);
  const trashArmedRef = useRef(false);
  const [drawModeArmed, setDrawModeArmed] = useState(false);
  const [pendingColor, setPendingColor] = useState(DEFAULT_NOTE_COLOR);

  useEffect(() => {
    saveNotes(state.notes);
  }, [state.notes]);

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
      <Toolbar
        drawModeArmed={drawModeArmed}
        onToggleDrawMode={() => setDrawModeArmed((v) => !v)}
        pendingColor={pendingColor}
        onPendingColorChange={setPendingColor}
      />
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
