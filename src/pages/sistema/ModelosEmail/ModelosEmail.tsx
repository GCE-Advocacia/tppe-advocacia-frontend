import { useEffect, useState } from 'react';
import { Mail, Monitor, Smartphone, Code2, AlignLeft, RefreshCw } from 'lucide-react';
import {
  listEmailTemplates,
  previewEmailTemplate,
  type EmailPreviewFormat,
  type EmailTemplate,
  type EmailTemplatePreview,
} from '../../../services/emailTemplates';
import styles from './ModelosEmail.module.css';

type Device = 'desktop' | 'mobile';

const DEVICE_WIDTH: Record<Device, number> = { desktop: 600, mobile: 360 };

export default function ModelosEmail() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [format, setFormat] = useState<EmailPreviewFormat>('html');
  const [device, setDevice] = useState<Device>('desktop');
  const [preview, setPreview] = useState<EmailTemplatePreview | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEmailTemplates()
      .then(items => {
        setTemplates(items);
        setSelectedId(current => current ?? items[0]?.id ?? null);
      })
      .catch(() => setError('Não foi possível carregar os modelos de e-mail.'))
      .finally(() => setLoadingList(false));
  }, []);

  async function loadPreview(id: string, fmt: EmailPreviewFormat) {
    setLoadingPreview(true);
    setError(null);
    try {
      setPreview(await previewEmailTemplate(id, fmt));
    } catch {
      setPreview(null);
      setError('Não foi possível gerar a pré-visualização.');
    } finally {
      setLoadingPreview(false);
    }
  }

  useEffect(() => {
    if (selectedId) void loadPreview(selectedId, format);
  }, [selectedId, format]);

  const selected = templates.find(t => t.id === selectedId);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Comunicação</p>
          <h1>Modelos de e-mail</h1>
          <p className={styles.subtitle}>
            Veja como cada e-mail do sistema chega para o cliente e para a equipe, com a marca do escritório.
          </p>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.list} aria-label="Tipos de e-mail">
          {loadingList
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeletonItem} />)
            : templates.map(template => (
                <button
                  key={template.id}
                  type="button"
                  className={`${styles.listItem} ${template.id === selectedId ? styles.listItemActive : ''}`}
                  onClick={() => setSelectedId(template.id)}
                >
                  <Mail size={16} className={styles.listIcon} />
                  <span>
                    <span className={styles.listName}>{template.name}</span>
                    <span className={styles.listDescription}>{template.description}</span>
                  </span>
                </button>
              ))}
        </aside>

        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <div className={styles.segmented} role="group" aria-label="Formato">
              <button
                type="button"
                className={format === 'html' ? styles.segmentActive : ''}
                onClick={() => setFormat('html')}
              >
                <Code2 size={15} /> HTML
              </button>
              <button
                type="button"
                className={format === 'text' ? styles.segmentActive : ''}
                onClick={() => setFormat('text')}
              >
                <AlignLeft size={15} /> Texto
              </button>
            </div>
            {format === 'html' && (
              <div className={styles.segmented} role="group" aria-label="Tamanho da tela">
                <button
                  type="button"
                  className={device === 'desktop' ? styles.segmentActive : ''}
                  onClick={() => setDevice('desktop')}
                >
                  <Monitor size={15} /> Desktop
                </button>
                <button
                  type="button"
                  className={device === 'mobile' ? styles.segmentActive : ''}
                  onClick={() => setDevice('mobile')}
                >
                  <Smartphone size={15} /> Celular
                </button>
              </div>
            )}
            {selectedId && (
              <button
                type="button"
                className={styles.refreshButton}
                onClick={() => void loadPreview(selectedId, format)}
                disabled={loadingPreview}
                title="Atualizar pré-visualização"
              >
                <RefreshCw size={15} className={loadingPreview ? styles.spinning : ''} />
              </button>
            )}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {preview && (
            <div className={styles.meta}>
              <span className={styles.metaLabel}>Assunto</span>
              <strong>{preview.subject}</strong>
              {selected && <span className={styles.metaHint}>Dados fictícios de exemplo</span>}
            </div>
          )}

          <div className={styles.stage}>
            {loadingPreview && !preview && <div className={styles.skeletonPreview} />}
            {preview && preview.format === 'html' && (
              <iframe
                title={`Pré-visualização: ${selected?.name ?? preview.id}`}
                className={styles.frame}
                style={{ width: DEVICE_WIDTH[device] }}
                srcDoc={preview.content}
                sandbox=""
              />
            )}
            {preview && preview.format === 'text' && <pre className={styles.text}>{preview.content}</pre>}
          </div>
        </section>
      </div>
    </div>
  );
}
