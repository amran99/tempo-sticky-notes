import styles from './ResizeHandle.module.css';

interface ResizeHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onLostPointerCapture: (e: React.PointerEvent) => void;
}

export function ResizeHandle(props: ResizeHandleProps) {
  return <div className={styles.handle} aria-label="Resize note" {...props} />;
}
