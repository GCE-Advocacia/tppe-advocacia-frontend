import DOMPurify from 'dompurify';
import { Eye, ArrowLeft, Play } from 'lucide-react';
import type { Artigo, Status } from './types';
import styles from './VisualizarArtigo.module.css';

interface Props {
  artigo: Artigo & { conteudo?: string; imagemPos?: { x: number; y: number } };
  onVoltar: () => void;
  onPublicar?: () => void;
}

/* ── Reading time estimate ── */
function calcLeitura(html: string = ''): number {
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/* ── Format saved time ── */
function horaAtual(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function VisualizarArtigo({ artigo, onVoltar, onPublicar }: Props) {
  const leitura = calcLeitura(artigo.conteudo);
  const salvoAs = horaAtual();

  return (
    <div className={styles.shell}>

      {/* ── Top navbar ── */}
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <span className={styles.navBrand}>
            <Eye size={16} strokeWidth={2} />
            Visualização do Artigo
          </span>
          <span className={styles.navStatus}>
            {artigo.status === 'PUBLICADO' ? 'Publicado' : 'Rascunho'} salvo às {salvoAs}
          </span>
        </div>
        <div className={styles.navRight}>
          <button className={styles.btnVoltar} onClick={onVoltar} type="button">
            <ArrowLeft size={15} /> <span className={styles.btnVoltarText}>Voltar ao Editor</span>
          </button>
          {artigo.status !== 'PUBLICADO' && onPublicar && (
            <button className={styles.btnPublicar} onClick={onPublicar} type="button">
              <Play size={13} fill="currentColor" /> Publicar
            </button>
          )}
        </div>
      </header>

      {/* ── Article ── */}
      <article className={styles.article}>

        {/* Category label */}
        {artigo.categoria && (
          <div className={styles.category}>
            <span className={styles.categoryLine} />
            <span className={styles.categoryText}>{artigo.categoria.toUpperCase()}</span>
          </div>
        )}

        {/* Title */}
        <h1 className={styles.title}>{artigo.titulo || 'Sem título'}</h1>

        {/* Author / meta row */}
        <div className={styles.meta}>
          <div className={styles.metaAuthor}>
            <div className={styles.avatar}>
              {artigo.autor?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <div className={styles.authorName}>{artigo.autor || 'Autor'}</div>
              <div className={styles.authorRole}>Advogado</div>
            </div>
          </div>
          <div className={styles.metaDivider} />
          <div className={styles.metaBlock}>
            <span className={styles.metaLabel}>DATA DE PUBLICAÇÃO</span>
            <span className={styles.metaValue}>{artigo.data || '—'}</span>
          </div>
          <div className={styles.metaDivider} />
          <div className={styles.metaBlock}>
            <span className={styles.metaLabel}>LEITURA ESTIMADA</span>
            <span className={styles.metaValue}>{leitura} {leitura === 1 ? 'minuto' : 'minutos'}</span>
          </div>
        </div>

        {/* Cover image — full bleed */}
        {artigo.imagem && (
          <div className={styles.coverWrap}>
            <img src={artigo.imagem} alt="Capa do artigo" className={styles.cover}
             style={{ objectPosition: artigo.imagemPos ? `${artigo.imagemPos.x}% ${artigo.imagemPos.y}%` : "50% 50%" }} />
          </div>
        )}

        {/* Body */}
        <div className={styles.body}>
          {artigo.conteudo ? (
            <div
              className={styles.content}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(artigo.conteudo) }}
            />
          ) : (
            artigo.resumo ? (
              <p className={styles.resumoFallback}>{artigo.resumo}</p>
            ) : (
              <p className={styles.empty}>Nenhum conteúdo escrito ainda.</p>
            )
          )}
        </div>

      </article>
    </div>
  );
}