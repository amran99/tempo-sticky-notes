import { forwardRef } from 'react';
import styles from './TrashZone.module.css';

interface TrashZoneProps {
  armed: boolean;
}

export const TrashZone = forwardRef<HTMLDivElement, TrashZoneProps>(function TrashZone({ armed }, ref) {
  return (
    <div ref={ref} className={`${styles.trash} ${armed ? styles.armed : ''}`} aria-label="Delete note drop zone">
      🗑
    </div>
  );
});
