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
  const [imgDim, setImgDim] = useState<{ width: number; height: number } | null>(null);
  const drag = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

  const FRAME_MAX_H = 390;
  const FRAME_MAX_W = 520;
  const frameW = Math.min(FRAME_MAX_H * aspectRatio, FRAME_MAX_W);
  const frameH = frameW / aspectRatio;

  // Calcula o overflow real da imagem para travamento de eixo estático e sensibilidade de arrasto 1:1
  const overflowRef = useRef({ x: frameW, y: frameH });
  if (imgDim && imgDim.width > 0 && imgDim.height > 0) {
    const scale = Math.max(frameW / imgDim.width, frameH / imgDim.height);
    const dispW = imgDim.width * scale;
    const dispH = imgDim.height * scale;
    overflowRef.current = {
      x: Math.max(0, dispW - frameW),
      y: Math.max(0, dispH - frameH),
    };
  }

  const handlers = useRef({
    move: (e: MouseEvent) => {
      if (!drag.current) return;
      const { x: overflowX, y: overflowY } = overflowRef.current;
      const mouseDx = e.clientX - drag.current.startX;
      const mouseDy = e.clientY - drag.current.startY;

      const deltaX = overflowX > 2 ? (-mouseDx / overflowX) * 100 : 0;
      const deltaY = overflowY > 2 ? (-mouseDy / overflowY) * 100 : 0;

      setPos({
        x: Math.min(100, Math.max(0, Math.round(drag.current.posX + deltaX))),
        y: Math.min(100, Math.max(0, Math.round(drag.current.posY + deltaY))),
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
              onLoad={e => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setImgDim({ width: img.naturalWidth, height: img.naturalHeight });
                }
              }}
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
