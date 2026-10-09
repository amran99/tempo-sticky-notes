import styles from './Toolbar.module.css';

const PALETTE = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff'];

interface ToolbarProps {
  drawModeArmed: boolean;
  onToggleDrawMode: () => void;
  pendingColor: string;
  onPendingColorChange: (color: string) => void;
}

export function Toolbar({ drawModeArmed, onToggleDrawMode, pendingColor, onPendingColorChange }: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={`${styles.addButton} ${drawModeArmed ? styles.armed : ''}`}
        onClick={onToggleDrawMode}
        aria-pressed={drawModeArmed}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
          <path d="M8 2.5v11M2.5 8h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {drawModeArmed ? 'Drag on the board…' : 'Add Note'}
      </button>
      <div className={styles.swatches} role="group" aria-label="Note color">
        {PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            className={`${styles.swatch} ${color === pendingColor ? styles.swatchSelected : ''}`}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
            aria-pressed={color === pendingColor}
            onClick={() => onPendingColorChange(color)}
          />
        ))}
      </div>
    </div>
  );
}
