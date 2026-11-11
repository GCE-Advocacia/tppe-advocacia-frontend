import { useState } from 'react';
import {
  Building2, Link2, Star, BookOpen, UserRound,
  Shield, MapPin, Check, Pencil,
} from 'lucide-react';
import type { LandingPageData, Diferencial, AreaAtuacao } from '../types';
import SectionCard from './SectionCard';
import Field from './Field';
import ImageUpload from './ImageUpload';
import styles from '../LandingPage.module.css';

export interface ConteudoSectionsProps {
  data: LandingPageData;
  onChange: <K extends keyof LandingPageData>(key: K, value: LandingPageData[K]) => void;
}

export default function ConteudoSections({ data, onChange }: ConteudoSectionsProps) {
  const [editingDif, setEditingDif] = useState<number | null>(null);
  const [editingArea, setEditingArea] = useState<number | null>(null);

  const updateDif = (id: number, field: keyof Diferencial, value: string) => {
    onChange('diferenciais', data.diferenciais.map(d => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const updateArea = (id: number, field: keyof AreaAtuacao, value: string) => {
    onChange('areas', data.areas.map(a => (a.id === id ? { ...a, [field]: value } : a)));
  };

  return (
    <>
      {/* ── Dados Institucionais ── */}
      <SectionCard icon={<Building2 size={20} />} title="Dados Institucionais">
        <div className={styles.row2}>
          <div>
            <Field label="E-MAIL DE CONTATO">
              <input className={styles.input} value={data.email} onChange={e => onChange('email', e.target.value)} />
            </Field>
            <Field label="TELEFONE">
              <input className={styles.input} value={data.telefone} onChange={e => onChange('telefone', e.target.value)} />
            </Field>
          </div>
          <Field label="ENDEREÇO">
            <textarea className={styles.textarea} rows={5} value={data.endereco} onChange={e => onChange('endereco', e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      {/* ── Links ── */}
      <SectionCard icon={<Link2 size={20} />} title="Links">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.row2}>
            <Field label="LINKEDIN DO ADVOGADO">
              <input className={styles.input} value={data.linkedin} onChange={e => onChange('linkedin', e.target.value)} />
            </Field>
            <Field label="INSTAGRAM DO ADVOGADO">
              <input className={styles.input} value={data.instagram} onChange={e => onChange('instagram', e.target.value)} />
            </Field>
          </div>
          <div className={styles.row2}>
            <Field label="WHATSAPP">
              <input className={styles.input} value={data.whatsapp} onChange={e => onChange('whatsapp', e.target.value)} />
            </Field>
            <Field label="SITE DO ESCRITÓRIO">
              <input className={styles.input} value={data.website} onChange={e => onChange('website', e.target.value)} />
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* ── Hero ── */}
      <SectionCard icon={<Star size={20} />} title="Hero (Destaque Principal)">
        <div className={styles.row2}>
          <div>
            <Field label="TÍTULO DO IMPACTO">
              <input className={styles.input} value={data.heroTitulo} onChange={e => onChange('heroTitulo', e.target.value)} />
            </Field>
            <Field label="SUBTEXTO DE APOIO">
              <textarea className={styles.textarea} rows={3} value={data.heroSubtexto} onChange={e => onChange('heroSubtexto', e.target.value)} />
            </Field>
          </div>
          <Field label="IMAGEM (HERO)">
            <ImageUpload
              value={data.heroImagem}
              onChange={v => onChange('heroImagem', v)}
              hint="Adicione uma imagem profissional que será principal da Landing Page."
              size="420px por 600px"
              position={data.heroImagemPos}
              onPositionChange={pos => onChange('heroImagemPos', pos)}
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
              <input className={styles.input} value={data.escritorioTitulo} onChange={e => onChange('escritorioTitulo', e.target.value)} />
            </Field>
            <Field label="CONTEÚDO DESCRITIVO">
              <textarea className={styles.textarea} rows={5} value={data.escritorioConteudo} onChange={e => onChange('escritorioConteudo', e.target.value)} />
            </Field>
          </div>
          <Field label="IMAGEM DO ESCRITÓRIO">
            <ImageUpload
              value={data.escritorioImagem}
              onChange={v => onChange('escritorioImagem', v)}
              hint="Adicione uma imagem profissional que ficará no sobre da Landing Page."
              size="500px por 575px"
              position={data.escritorioImagemPos}
              onPositionChange={pos => onChange('escritorioImagemPos', pos)}
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
              <input className={styles.input} value={data.advogadoTitulo} onChange={e => onChange('advogadoTitulo', e.target.value)} />
            </Field>
            <Field label="OAB">
              <input className={styles.input} value={data.advogadoOab} onChange={e => onChange('advogadoOab', e.target.value)} />
            </Field>
            <Field label="CONTEÚDO DESCRITIVO">
              <textarea className={styles.textarea} rows={4} value={data.advogadoConteudo} onChange={e => onChange('advogadoConteudo', e.target.value)} />
            </Field>
          </div>
          <Field label="IMAGEM DO ADVOGADO">
            <ImageUpload
              value={data.advogadoImagem}
              onChange={v => onChange('advogadoImagem', v)}
              hint="Adicione uma imagem profissional do advogado que ficará no sobre da Landing Page."
              size="475px por 600px"
              position={data.advogadoImagemPos}
              onPositionChange={pos => onChange('advogadoImagemPos', pos)}
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
                  <button type="button" className={styles.iconBtnGreen} onClick={() => setEditingDif(null)}><Check size={14} /></button>
                </>
              ) : (
                <>
                  <p className={styles.listCardTitle}>{d.titulo}</p>
                  <p className={styles.listCardDesc}>{d.descricao}</p>
                  <div className={styles.listCardActions}>
                    <button type="button" className={styles.iconBtnGray} onClick={() => setEditingDif(d.id)}><Pencil size={13} /></button>
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
                  <button type="button" className={styles.iconBtnGreen} onClick={() => setEditingArea(null)}><Check size={14} /></button>
                </>
              ) : (
                <>
                  <p className={styles.listCardTitle}>{a.titulo}</p>
                  <p className={styles.listCardDesc}>{a.descricao}</p>
                  <div className={styles.listCardActions}>
                    <button type="button" className={styles.iconBtnGray} onClick={() => setEditingArea(a.id)}><Pencil size={13} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
