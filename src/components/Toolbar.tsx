import styles from './Toolbar.module.css';

interface ToolbarProps {
  drawModeArmed: boolean;
  onToggleDrawMode: () => void;
}

export function Toolbar({ drawModeArmed, onToggleDrawMode }: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <button type="button" onClick={onToggleDrawMode} aria-pressed={drawModeArmed}>
        {drawModeArmed ? 'Click-drag on the board…' : 'Add Note'}
      </button>
    </div>
  );
}
