import { useState, useRef } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import { uploadMedia, validateMediaFile, MEDIA_ACCEPT } from '../../../../services/officeConfigService';
import ImagePositionModal from '../../../../components/sistema/shared/ImagePositionModal';
import styles from '../LandingPage.module.css';

export interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  hint: string;
  size: string;
  position?: { x: number; y: number };
  onPositionChange?: (pos: { x: number; y: number }) => void;
  aspectRatio?: number;
  posLabel?: string;
}

export default function ImageUpload({
  value,
  onChange,
  hint,
  size,
  position = { x: 50, y: 50 },
  onPositionChange,
  aspectRatio = 1,
  posLabel = 'Imagem',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    const validationError = validateMediaFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMedia(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div
        className={styles.imgBox}
        style={value ? { padding: '20px 16px' } : undefined}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        {value ? (
          <>
            <div
              className={styles.imgWithPos}
              style={{
                aspectRatio: String(aspectRatio),
                width: 'auto',
                maxWidth: '100%',
                height: '280px',
                margin: '0 auto 12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0',
              }}
            >
              <img
                src={value}
                alt="preview"
                className={styles.imgPreview}
                style={{ objectPosition: `${position.x}% ${position.y}%` }}
              />
            </div>
            <div className={styles.imgActions}>
              {onPositionChange && (
                <button
                  type="button"
                  className={styles.imgBtnSecondary}
                  onClick={() => setShowModal(true)}
                >
                  Reposicionar
                </button>
              )}
              <button
                type="button"
                className={styles.imgBtn}
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? 'Enviando...' : 'Trocar Imagem'}
              </button>
            </div>
            {error && <p style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{error}</p>}
          </>
        ) : (
          <>
            {uploading ? (
              <Loader2 size={32} className={styles.imgIcon} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <ImageIcon size={32} className={styles.imgIcon} />
            )}
            <p className={styles.imgHint}>{hint}</p>
            <p className={styles.imgSize}>A imagem deve ser {size}.</p>
            {error && <p style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{error}</p>}
            <button
              type="button"
              className={styles.imgBtn}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? 'Enviando...' : 'Carregar Imagem'}
            </button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={MEDIA_ACCEPT}
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) handleFile(f);
          }}
        />
      </div>
      {showModal && value && onPositionChange && (
        <ImagePositionModal
          src={value}
          position={position}
          aspectRatio={aspectRatio}
          label={posLabel}
          onConfirm={pos => {
            onPositionChange(pos);
            setShowModal(false);
          }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}
