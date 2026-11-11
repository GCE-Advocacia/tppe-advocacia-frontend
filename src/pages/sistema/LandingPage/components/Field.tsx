import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import styles from '../LandingPage.module.css';

export interface FieldProps {
  label: string;
  tooltip?: string;
  children: ReactNode;
}

export default function Field({ label, tooltip, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>
        {label}
        {tooltip && (
          <span className={styles.tooltipWrapper} tabIndex={0} aria-label={tooltip}>
            <Info size={13} className={styles.tooltipIcon} />
            <span className={styles.tooltipText}>{tooltip}</span>
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
