import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Download, FileText, Paperclip, Trash2 } from 'lucide-react';
import { ApiError, getSessionClaims } from '../../../services/api';
import {
  deleteProcessDocument,
  DOCUMENT_ACCEPT,
  DOCUMENT_MAX_SIZE_MB,
  downloadProcessDocument,
  listProcessDocuments,
  ProcessDocument,
  uploadProcessDocument,
} from '../../../services/processes';
import styles from './Processos.module.css';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  processId: number;
  onSuccess: (message: string) => void;
  onError: (error: unknown) => void;
};

export default function ProcessDocumentsSection({ processId, onSuccess, onError }: Props) {
  const [documents, setDocuments] = useState<ProcessDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const claims = getSessionClaims();
  const isAdmin = claims?.role === 'ADMIN';
  const currentUserId = claims ? Number(claims.sub) : null;

  async function reload() {
    try {
      const response = await listProcessDocuments(processId);
      setDocuments(response.data);
    } catch (requestError) {
      onError(requestError);
    }
  }

  useEffect(() => {
    void reload();
  }, [processId]);

  async function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > DOCUMENT_MAX_SIZE_MB * 1024 * 1024) {
      onError(new ApiError('Arquivo muito grande.', 413, 'FILE_TOO_LARGE'));
      return;
    }
    setUploading(true);
    try {
      await uploadProcessDocument(processId, file);
      await reload();
      onSuccess('Documento anexado.');
    } catch (requestError) {
      onError(requestError);
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: ProcessDocument) {
    setBusyId(doc.id);
    try {
      await downloadProcessDocument(processId, doc);
    } catch (requestError) {
      onError(requestError);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(doc: ProcessDocument) {
    if (!window.confirm(`Excluir o documento "${doc.original_name}"?`)) return;
    setBusyId(doc.id);
    try {
      await deleteProcessDocument(processId, doc.id);
      await reload();
      onSuccess('Documento excluído.');
    } catch (requestError) {
      onError(requestError);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.documentsSection}>
      <div className={styles.notesHeader}>
        <h3><Paperclip size={16} /> Documentos</h3>
        <span>{documents.length} documento(s)</span>
      </div>

      <div className={styles.documentUpload}>
        <input
          ref={inputRef}
          type="file"
          accept={DOCUMENT_ACCEPT}
          onChange={event => void handleFileChosen(event)}
          hidden
        />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Paperclip size={15} />
          {uploading ? 'Enviando...' : 'Anexar documento'}
        </button>
        <small>PDF, JPG, PNG ou DOCX · até {DOCUMENT_MAX_SIZE_MB} MB</small>
      </div>

      <div className={styles.documentList}>
        {documents.length === 0 && (
          <p className={styles.notesEmpty}>Nenhum documento anexado.</p>
        )}
        {documents.map(doc => {
          const canDelete = isAdmin || doc.uploaded_by === currentUserId;
          return (
            <article className={styles.documentItem} key={doc.id}>
              <FileText size={18} />
              <div className={styles.documentInfo}>
                <strong title={doc.original_name}>{doc.original_name}</strong>
                <span>
                  {formatSize(doc.size_bytes)} · {doc.uploaded_by_name ?? 'Usuário removido'} ·{' '}
                  {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <button
                type="button"
                className={styles.documentAction}
                onClick={() => void handleDownload(doc)}
                disabled={busyId === doc.id}
                aria-label={`Baixar ${doc.original_name}`}
              >
                <Download size={15} />
              </button>
              {canDelete && (
                <button
                  type="button"
                  className={styles.documentAction}
                  onClick={() => void handleDelete(doc)}
                  disabled={busyId === doc.id}
                  aria-label={`Excluir ${doc.original_name}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
