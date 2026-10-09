import { forwardRef } from 'react';
import styles from './TrashZone.module.css';

interface TrashZoneProps {
  armed: boolean;
}

export const TrashZone = forwardRef<HTMLDivElement, TrashZoneProps>(function TrashZone({ armed }, ref) {
  return (
    <div ref={ref} className={`${styles.trash} ${armed ? styles.armed : ''}`} aria-label="Delete note drop zone">
      <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
        <path
          d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6.5 0 .6 9.1A1.5 1.5 0 0 0 7.6 16.5h4.8a1.5 1.5 0 0 0 1.5-1.4l.6-9.1M8.5 9v5M11.5 9v5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});
