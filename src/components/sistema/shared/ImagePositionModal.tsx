import { useState, useRef } from 'react';
import { X, Check } from 'lucide-react';
import styles from './ImagePositionModal.module.css';

interface Props {
  src: string;
  position: { x: number; y: number };
  aspectRatio: number;
  label: string;
  onConfirm: (pos: { x: number; y: number }) => void;
  onCancel: () => void;
}

export default function ImagePositionModal({ src, position, aspectRatio, label, onConfirm, onCancel }: Props) {
  const [pos, setPos] = useState(position);
  const drag = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

  const FRAME_MAX_H = 390;
  const FRAME_MAX_W = 520;
  const frameW = Math.min(FRAME_MAX_H * aspectRatio, FRAME_MAX_W);
  const frameH = frameW / aspectRatio;

  const handlers = useRef({
    move: (e: MouseEvent) => {
      if (!drag.current) return;
      const dx = ((e.clientX - drag.current.startX) / frameW) * -100;
      const dy = ((e.clientY - drag.current.startY) / frameH) * -100;
      setPos({
        x: Math.min(100, Math.max(0, drag.current.posX + dx)),
        y: Math.min(100, Math.max(0, drag.current.posY + dy)),
      });
    },
    up: () => {
      drag.current = null;
      window.removeEventListener('mousemove', handlers.current.move);
    },
  });

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    drag.current = { startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y };
    window.addEventListener('mousemove', handlers.current.move);
    window.addEventListener('mouseup', handlers.current.up, { once: true });
  }

  return (
    <div className={styles.overlay} data-testid="image-position-modal" onMouseDown={onCancel}>
      <div className={styles.box} onMouseDown={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Reposicionar imagem</span>
          <button className={styles.close} onClick={onCancel}><X size={18} /></button>
        </div>
        <p className={styles.sub}>
          Arraste a imagem para ajustar o enquadramento. O que você vê aqui é exatamente como vai aparecer na <strong>{label}</strong>.
        </p>
        <div className={styles.frameWrap}>
          <div
            className={styles.frame}
            data-testid="image-position-frame"
            style={{ width: frameW, height: frameH }}
            onMouseDown={handleMouseDown}
          >
            <img
              src={src} alt="" className={styles.img} draggable={false}
              style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
            />
            <div className={styles.dragHint}>↕ ↔</div>
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onCancel}><X size={14} /> Cancelar</button>
          <button className={styles.btnConfirm} onClick={() => onConfirm(pos)}><Check size={14} /> Confirmar</button>
        </div>
      </div>
    </div>
  );
}
