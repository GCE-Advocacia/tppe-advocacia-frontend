import type { ReactNode } from 'react';
import styles from '../LandingPage.module.css';

export interface SectionCardProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

export default function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{icon}</span>
        <h2 className={styles.cardTitle}>{title}</h2>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}
