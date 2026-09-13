import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Building2, Link2, Star, BookOpen, UserRound,
  Shield, MapPin, ImageIcon, Pencil, Check, X, Loader2, Palette,
} from 'lucide-react';
import { ApiError } from '../../../services/api';
import { getOfficeConfigUI, updateOfficeConfig, uploadMedia } from '../../../services/officeConfigService';
import type { LandingPageData, Diferencial, AreaAtuacao } from './types';
import ImagePositionModal from '../../../components/sistema/shared/ImagePositionModal';
import ColorPicker from '../../../components/sistema/shared/ColorPicker';

const EMPTY_DIFERENCIAIS: Diferencial[] = [
  { id: 1, titulo: '', descricao: '' },
  { id: 2, titulo: '', descricao: '' },
  { id: 3, titulo: '', descricao: '' },
];

const EMPTY_AREAS: AreaAtuacao[] = [
  { id: 1, titulo: '', descricao: '' },
  { id: 2, titulo: '', descricao: '' },
  { id: 3, titulo: '', descricao: '' },
  { id: 4, titulo: '', descricao: '' },
  { id: 5, titulo: '', descricao: '' },
  { id: 6, titulo: '', descricao: '' },
];

const EMPTY_DATA: LandingPageData = {
  email: '', endereco: '', telefone: '',
  linkedin: '', instagram: '', whatsapp: '', website: '',
  heroTitulo: '', heroSubtexto: '', heroImagem: '', heroImagemPos: { x: 50, y: 50 },
  escritorioTitulo: '', escritorioConteudo: '', escritorioImagem: '', escritorioImagemPos: { x: 50, y: 50 },
  advogadoTitulo: '', advogadoOab: '', advogadoConteudo: '', advogadoImagem: '', advogadoImagemPos: { x: 50, y: 50 },
  diferenciais: EMPTY_DIFERENCIAIS,
  areas: EMPTY_AREAS,
  color: '#232C43',
  colorBgPrimary: '#232C43',
  colorBgSecondary: '#F5F3EF',
  colorBgSobre: '#FFFFFF',
  colorButtons: '#661C16',
  colorTitlePrimary: '#FFFFFF',
  colorTitleSecondary: '#232C43',
};
import styles from './LandingPage.module.css';

// ── helpers ──────────────────────────────────────────────
function deepEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── sub-components ───────────────────────────────────────
interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  hint: string;
  size: string;
  position?: { x: number; y: number };
  onPositionChange?: (pos: { x: number; y: number }) => void;
  aspectRatio?: number;
  posLabel?: string;
}
function ImageUpload({ value, onChange, hint, size, position = { x: 50, y: 50 }, onPositionChange, aspectRatio = 1, posLabel = 'Imagem' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
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
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {value ? (
          <>
            <div className={styles.imgWithPos}>
              <img
                src={value} alt="preview" className={styles.imgPreview}
                style={{ objectPosition: `${position.x}% ${position.y}%` }}
              />
            </div>
            <div className={styles.imgActions}>
              {onPositionChange && (
                <button className={styles.imgBtnSecondary} onClick={() => setShowModal(true)}>
                  Reposicionar
                </button>
              )}
              <button className={styles.imgBtn} disabled={uploading} onClick={() => inputRef.current?.click()}>
                {uploading ? 'Enviando...' : 'Trocar Imagem'}
              </button>
            </div>
            {error && <p style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{error}</p>}
          </>
        ) : (
          <>
            {uploading
              ? <Loader2 size={32} className={styles.imgIcon} style={{ animation: 'spin 1s linear infinite' }} />
              : <ImageIcon size={32} className={styles.imgIcon} />
            }
            <p className={styles.imgHint}>{hint}</p>
            <p className={styles.imgSize}>A imagem deve ser {size}.</p>
            {error && <p style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{error}</p>}
            <button className={styles.imgBtn} disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? 'Enviando...' : 'Carregar Imagem'}
            </button>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
      {showModal && value && onPositionChange && (
        <ImagePositionModal
          src={value}
          position={position}
          aspectRatio={aspectRatio}
          label={posLabel}
          onConfirm={pos => { onPositionChange(pos); setShowModal(false); }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}

interface SectionCardProps { icon: React.ReactNode; title: string; children: React.ReactNode; }
function SectionCard({ icon, title, children }: SectionCardProps) {
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

interface FieldProps { label: string; children: React.ReactNode; }
function Field({ label, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

// ── main page ────────────────────────────────────────────
export default function LandingPageConfig() {
  const [saved,   setSaved]   = useState<LandingPageData>(EMPTY_DATA);
  const [data,    setData]    = useState<LandingPageData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isDirty = !deepEqual(data, saved);

  useEffect(() => {
    getOfficeConfigUI()
      .then(cfg => {
        const merged: LandingPageData = {
          ...cfg,
          diferenciais: cfg.diferenciais.length > 0 ? cfg.diferenciais : EMPTY_DIFERENCIAIS,
          areas:        cfg.areas.length        > 0 ? cfg.areas        : EMPTY_AREAS,
        };
        setSaved(merged);
        setData(merged);
      })
      .catch(() => { setLoadError('Não foi possível carregar as configurações. Recarregue a página.'); })
      .finally(() => setLoading(false));
  }, []);

  const set = useCallback(<K extends keyof LandingPageData>(key: K, value: LandingPageData[K]) => {
    setData(d => ({ ...d, [key]: value }));
  }, []);

  const discard = () => setData(saved);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateOfficeConfig(data);
      setSaved(updated);
      setData(updated);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : 'Erro ao salvar. Verifique sua conexão e tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Diferencial inline edit
  const [editingDif, setEditingDif] = useState<number | null>(null);
  const updateDif = (id: number, field: keyof Diferencial, value: string) =>
    set('diferenciais', data.diferenciais.map(d => d.id === id ? { ...d, [field]: value } : d));

  // Área inline edit
  const [editingArea, setEditingArea] = useState<number | null>(null);
  const updateArea = (id: number, field: keyof AreaAtuacao, value: string) =>
    set('areas', data.areas.map(a => a.id === id ? { ...a, [field]: value } : a));

  if (loading) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#666' }} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <p style={{ color: '#c0392b', fontSize: '0.95rem' }}>{loadError}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Configuração da Landing Page</h1>

      {/* ── Dados Institucionais ── */}
      <SectionCard icon={<Building2 size={20} />} title="Dados Institucionais">
        <div className={styles.row2}>
          <div>
            <Field label="E-MAIL DE CONTATO">
              <input className={styles.input} value={data.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="TELEFONE">
              <input className={styles.input} value={data.telefone} onChange={e => set('telefone', e.target.value)} />
            </Field>
          </div>
          <Field label="ENDEREÇO">
            <textarea className={styles.textarea} rows={5} value={data.endereco} onChange={e => set('endereco', e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      {/* ── Links ── */}
      <SectionCard icon={<Link2 size={20} />} title="Links">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className={styles.row2}>
          <Field label="LINKEDIN DO ADVOGADO">
            <input className={styles.input} value={data.linkedin} onChange={e => set('linkedin', e.target.value)} />
          </Field>
          <Field label="INSTAGRAM DO ADVOGADO">
            <input className={styles.input} value={data.instagram} onChange={e => set('instagram', e.target.value)} />
          </Field>
        </div>
        <div className={styles.row2}>
          <Field label="WHATSAPP">
            <input className={styles.input} value={data.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
          </Field>
          <Field label="SITE DO ESCRITÓRIO">
            <input className={styles.input} value={data.website} onChange={e => set('website', e.target.value)} />
          </Field>
        </div>
        </div>
      </SectionCard>

      {/* ── Hero ── */}
      <SectionCard icon={<Star size={20} />} title="Hero (Destaque Principal)">
        <div className={styles.row2}>
          <div>
            <Field label="TÍTULO DO IMPACTO">
              <input className={styles.input} value={data.heroTitulo} onChange={e => set('heroTitulo', e.target.value)} />
            </Field>
            <Field label="SUBTEXTO DE APOIO">
              <textarea className={styles.textarea} rows={3} value={data.heroSubtexto} onChange={e => set('heroSubtexto', e.target.value)} />
            </Field>
          </div>
          <Field label="IMAGEM (HERO)">
            <ImageUpload
              value={data.heroImagem} onChange={v => set('heroImagem', v)}
              hint="Adicione uma imagem profissional que será principal da Landing Page."
              size="420px por 600px"
              position={data.heroImagemPos}
              onPositionChange={pos => set('heroImagemPos', pos)}
              aspectRatio={420 / 600}
              posLabel="Hero"
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── Sobre Escritório ── */}
      <SectionCard icon={<BookOpen size={20} />} title="Sobre Escritório">
        <div className={styles.row2}>
          <div>
            <Field label="TÍTULO DA SEÇÃO">
              <input className={styles.input} value={data.escritorioTitulo} onChange={e => set('escritorioTitulo', e.target.value)} />
            </Field>
            <Field label="CONTEÚDO DESCRITIVO">
              <textarea className={styles.textarea} rows={5} value={data.escritorioConteudo} onChange={e => set('escritorioConteudo', e.target.value)} />
            </Field>
          </div>
          <Field label="IMAGEM DO ESCRITÓRIO">
            <ImageUpload
              value={data.escritorioImagem} onChange={v => set('escritorioImagem', v)}
              hint="Adicione uma imagem profissional que ficará no sobre da Landing Page."
              size="500px por 575px"
              position={data.escritorioImagemPos}
              onPositionChange={pos => set('escritorioImagemPos', pos)}
              aspectRatio={500 / 575}
              posLabel="Sobre Escritório"
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── Sobre Advogado ── */}
      <SectionCard icon={<UserRound size={20} />} title="Sobre Advogado">
        <div className={styles.row2}>
          <div>
            <Field label="TÍTULO DA SEÇÃO">
              <input className={styles.input} value={data.advogadoTitulo} onChange={e => set('advogadoTitulo', e.target.value)} />
            </Field>
            <Field label="OAB">
              <input className={styles.input} value={data.advogadoOab} onChange={e => set('advogadoOab', e.target.value)} />
            </Field>
            <Field label="CONTEÚDO DESCRITIVO">
              <textarea className={styles.textarea} rows={4} value={data.advogadoConteudo} onChange={e => set('advogadoConteudo', e.target.value)} />
            </Field>
          </div>
          <Field label="IMAGEM DO ADVOGADO">
            <ImageUpload
              value={data.advogadoImagem} onChange={v => set('advogadoImagem', v)}
              hint="Adicione uma imagem profissional do advogado que ficará no sobre da Landing Page."
              size="475px por 600px"
              position={data.advogadoImagemPos}
              onPositionChange={pos => set('advogadoImagemPos', pos)}
              aspectRatio={475 / 600}
              posLabel="Sobre o Advogado"
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── Diferenciais ── */}
      <SectionCard icon={<Shield size={20} />} title="Diferenciais">
        <div className={styles.grid3}>
          {data.diferenciais.map(d => (
            <div key={d.id} className={`${styles.listCard} ${editingDif === d.id ? styles.listCardEditing : ''}`}>
              {editingDif === d.id ? (
                <>
                  <input className={styles.inlineInput} value={d.titulo} onChange={e => updateDif(d.id, 'titulo', e.target.value)} />
                  <textarea className={styles.inlineTextarea} rows={3} value={d.descricao} onChange={e => updateDif(d.id, 'descricao', e.target.value)} />
                  <button className={styles.iconBtnGreen} onClick={() => setEditingDif(null)}><Check size={14} /></button>
                </>
              ) : (
                <>
                  <p className={styles.listCardTitle}>{d.titulo}</p>
                  <p className={styles.listCardDesc}>{d.descricao}</p>
                  <div className={styles.listCardActions}>
                    <button className={styles.iconBtnGray} onClick={() => setEditingDif(d.id)}><Pencil size={13} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Áreas de Atuação ── */}
      <SectionCard icon={<MapPin size={20} />} title="Áreas de Atuação">
        <div className={styles.grid3}>
          {data.areas.map(a => (
            <div key={a.id} className={`${styles.listCard} ${editingArea === a.id ? styles.listCardEditing : ''}`}>
              {editingArea === a.id ? (
                <>
                  <input className={styles.inlineInput} value={a.titulo} onChange={e => updateArea(a.id, 'titulo', e.target.value)} />
                  <textarea className={styles.inlineTextarea} rows={3} value={a.descricao} onChange={e => updateArea(a.id, 'descricao', e.target.value)} />
                  <button className={styles.iconBtnGreen} onClick={() => setEditingArea(null)}><Check size={14} /></button>
                </>
              ) : (
                <>
                  <p className={styles.listCardTitle}>{a.titulo}</p>
                  <p className={styles.listCardDesc}>{a.descricao}</p>
                  <div className={styles.listCardActions}>
                    <button className={styles.iconBtnGray} onClick={() => setEditingArea(a.id)}><Pencil size={13} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Identidade Visual / Cores ── */}
      <SectionCard icon={<Palette size={20} />} title="Cores da Landing Page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Botão para restaurar cores originais */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--navy)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
              onClick={() => {
                setData(d => ({
                  ...d,
                  color: '#232C43',
                  colorBgPrimary: '#232C43',
                  colorBgSecondary: '#F5F3EF',
                  colorBgSobre: '#FFFFFF',
                  colorButtons: '#661C16',
                  colorTitlePrimary: '#FFFFFF',
                  colorTitleSecondary: '#232C43',
                }));
              }}
            >
              ↺ Restaurar Cores Originais do Escritório
            </button>
          </div>

          {/* 1 - Cores de Fundo */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
              1. Cores de Fundo
            </h3>
            <div className={styles.row2}>
              <Field label="FUNDO: NAVBAR, HERO, DIFERENCIAIS, ARTIGOS E RODAPÉ">
                <ColorPicker
                  value={data.colorBgPrimary || '#232C43'}
                  onChange={v => {
                    set('colorBgPrimary', v);
                    set('color', v);
                  }}
                />
              </Field>

              <Field label="FUNDO: ESCRITÓRIO, ÁREAS E CONTATO">
                <ColorPicker
                  value={data.colorBgSecondary || '#F5F3EF'}
                  onChange={v => set('colorBgSecondary', v)}
                />
              </Field>
            </div>

            <div style={{ marginTop: 16, maxWidth: 'calc(50% - 12px)' }}>
              <Field label="FUNDO: SOBRE (INDEPENDENTE)">
                <ColorPicker
                  value={data.colorBgSobre || '#FFFFFF'}
                  onChange={v => set('colorBgSobre', v)}
                />
              </Field>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0' }} />

          {/* 2 - Cores dos Botões */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
              2. Cores dos Botões
            </h3>
            <div style={{ maxWidth: 'calc(50% - 12px)' }}>
              <Field label="BOTÕES DE AÇÃO (AGENDAR, FALE CONOSCO, WHATSAPP, ENVIAR)">
                <ColorPicker
                  value={data.colorButtons || '#661C16'}
                  onChange={v => set('colorButtons', v)}
                />
              </Field>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0' }} />

          {/* 3 - Cores das Fontes */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
              3. Cores dos Títulos (h2)
            </h3>
            <div className={styles.row2}>
              <Field label="TÍTULOS: HERO, DIFERENCIAIS, ARTIGOS E RODAPÉ">
                <ColorPicker
                  value={data.colorTitlePrimary || '#FFFFFF'}
                  onChange={v => set('colorTitlePrimary', v)}
                />
              </Field>

              <Field label="TÍTULOS: ESCRITÓRIO, ÁREAS, CONTATO E SOBRE">
                <ColorPicker
                  value={data.colorTitleSecondary || '#232C43'}
                  onChange={v => set('colorTitleSecondary', v)}
                />
              </Field>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Bottom bar ── */}
      <div className={`${styles.bottomBar} ${isDirty || saveError ? styles.bottomBarVisible : ''}`}>
        {saveError && (
          <span className={styles.bottomError}>{saveError}</span>
        )}
        {!saveError && (
          <span className={styles.bottomMsg}>
            <span className={styles.dot} /> Alterações não salvas detectadas...
          </span>
        )}
        <div className={styles.bottomActions}>
          <button className={styles.btnDiscard} onClick={discard} disabled={saving}>
            <X size={15} /> Descartar
          </button>
          <button className={styles.btnSave} onClick={save} disabled={saving}>
            {saving
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
              : <><Check size={15} /> Salvar alterações</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
