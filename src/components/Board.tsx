import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { notesReducer } from '../state/notesReducer';
import { loadInitialState, saveNotes } from '../state/notesStorage';
import type { Point, Rect } from '../interaction/geometry';
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
  const [dragActive, setDragActive] = useState(false);
  const dragActiveRef = useRef(false);
  const [drawModeArmed, setDrawModeArmed] = useState(false);
  const [pendingColor, setPendingColor] = useState(DEFAULT_NOTE_COLOR);
  // The note a user just drew (gets auto-focused once) and the note selected for
  // keyboard actions (e.g. Delete) - two distinct, short-lived, UI-only signals.
  const [autoFocusNoteId, setAutoFocusNoteId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  useEffect(() => {
    saveNotes(state.notes);
  }, [state.notes]);

  // Only triggers a re-render when the armed/active state actually flips, instead
  // of on every animation frame while a note is dragged over/near the trash zone.
  const setTrashArmedIfChanged = useCallback((armed: boolean) => {
    if (trashArmedRef.current === armed) return;
    trashArmedRef.current = armed;
    setTrashArmed(armed);
  }, []);

  const setDragActiveIfChanged = useCallback((active: boolean) => {
    if (dragActiveRef.current === active) return;
    dragActiveRef.current = active;
    setDragActive(active);
  }, []);

  const getCanvasRect = useCallback((): Rect => {
    const r = canvasRef.current?.getBoundingClientRect();
    return r ? { x: 0, y: 0, width: r.width, height: r.height } : { x: 0, y: 0, width: 0, height: 0 };
  }, []);

  // The canvas's own position in viewport coordinates - needed to convert a note's
  // canvas-local x/y into the same coordinate space as the (fixed-position) trash
  // zone's rect, for the drag-vs-trash overlap test.
  const getCanvasOrigin = useCallback((): Point => {
    const r = canvasRef.current?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top } : { x: 0, y: 0 };
  }, []);

  const getTrashRect = useCallback((): Rect => {
    const r = trashRef.current?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : { x: 0, y: 0, width: 0, height: 0 };
  }, []);

  const clearAutoFocus = useCallback(() => setAutoFocusNoteId(null), []);

  const handleDeselect = useCallback(() => setSelectedNoteId(null), []);

  // Keyboard delete for the selected note. Ignored while a textarea (note text
  // editing) or other form control has focus, so Backspace/Delete there edits text
  // instead of removing the whole note.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (!selectedNoteId) return;
      const active = document.activeElement;
      const isEditingText = active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement;
      if (isEditingText) return;
      dispatch({ type: 'DELETE', id: selectedNoteId });
      setSelectedNoteId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteId]);

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
        dragActive={dragActive}
        trashRef={trashRef}
        getCanvasRect={getCanvasRect}
        getCanvasOrigin={getCanvasOrigin}
        getTrashRect={getTrashRect}
        setTrashArmed={setTrashArmedIfChanged}
        setDragActive={setDragActiveIfChanged}
        drawModeArmed={drawModeArmed}
        pendingColor={pendingColor}
        onCreated={(id) => {
          setDrawModeArmed(false);
          setAutoFocusNoteId(id);
          setSelectedNoteId(id);
        }}
        autoFocusNoteId={autoFocusNoteId}
        onAutoFocusConsumed={clearAutoFocus}
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        onDeselect={handleDeselect}
      />
    </div>
  );
}
