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
      <button type="button" onClick={onToggleDrawMode} aria-pressed={drawModeArmed}>
        {drawModeArmed ? 'Click-drag on the board…' : 'Add Note'}
      </button>
      <div className={styles.swatches} role="group" aria-label="Note color">
        {PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            className={styles.swatch}
            style={{ backgroundColor: color, outline: color === pendingColor ? '2px solid #111827' : 'none' }}
            aria-label={`Select color ${color}`}
            aria-pressed={color === pendingColor}
            onClick={() => onPendingColorChange(color)}
          />
        ))}
      </div>
    </div>
  );
}
