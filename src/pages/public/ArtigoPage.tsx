import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiRequest } from '../../services/api';
import type { SuccessResponse } from '../../services/api';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import styles from '../sistema/Artigos_/VisualizarArtigo.module.css';
import pageStyles from './ArtigoPage.module.css';

interface ArticleDetail {
  id: number;
  title: string;
  content: string;
  category: string | null;
  summary: string | null;
  cover_image_url: string | null;
  cover_image_position: string | null;
  status: string;
  author_name: string;
  created_at: string;
}

function calcLeitura(html: string = ''): number {
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function ArticleHeader() {
  return (
    <header className={pageStyles.header}>
      <a href="/" aria-label="Página inicial" className={pageStyles.logoLink}>
        <BrandLogo background="light" className={pageStyles.logo} />
      </a>
      <a href="/#artigos" className={styles.btnVoltar} style={{ textDecoration: 'none' }}>
        <ArrowLeft size={15} /> Voltar aos artigos
      </a>
    </header>
  );
}

export default function ArtigoPage() {
  const { id } = useParams<{ id: string }>();
  const [artigo, setArtigo] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiRequest<SuccessResponse<ArticleDetail>>(`/articles/${id}`, { authenticated: false })
      .then(res => setArtigo(res.data))
      .catch(() => setErro('Artigo não encontrado.'))
      .finally(() => setLoading(false));
  }, [id]);

  const data = artigo
    ? new Date(artigo.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '';

  const leitura = artigo ? calcLeitura(artigo.content) : 0;

  if (loading) {
    return (
      <div className={styles.shell} style={{ margin: 0 }}>
        <ArticleHeader />
        <article className={styles.article} aria-label="Carregando artigo" aria-busy="true">
          <div style={{ maxWidth: 800, margin: '48px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[30, 80, 60, 100, 95, 85, 70].map((w, i) => (
              <div key={i} style={{
                height: i === 1 ? 36 : 14,
                width: `${w}%`,
                background: 'linear-gradient(90deg,#e8e8e8 25%,#f0f0f0 50%,#e8e8e8 75%)',
                backgroundSize: '200% 100%',
                borderRadius: 4,
                animation: 'shimmer 1.4s infinite',
              }} />
            ))}
          </div>
        </article>
      </div>
    );
  }

  if (erro || !artigo) {
    return (
      <div className={styles.shell} style={{ margin: 0 }}>
        <ArticleHeader />
        <article className={styles.article}>
          <p style={{ maxWidth: 800, margin: '48px auto', padding: '0 24px', color: 'var(--crimson, #c0392b)' }}>
            {erro ?? 'Artigo não encontrado.'}
          </p>
        </article>
      </div>
    );
  }

  return (
    <div className={styles.shell} style={{ margin: 0 }}>

      <ArticleHeader />

      <article className={styles.article}>

        {artigo.category && (
          <div className={styles.category}>
            <span className={styles.categoryLine} />
            <span className={styles.categoryText}>{artigo.category.toUpperCase()}</span>
          </div>
        )}

        <h1 className={styles.title}>{artigo.title}</h1>

        <div className={styles.meta}>
          <div className={styles.metaAuthor}>
            <div className={styles.avatar}>
              {artigo.author_name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <div className={styles.authorName}>{artigo.author_name}</div>
              <div className={styles.authorRole}>Advogado</div>
            </div>
          </div>
          <div className={styles.metaDivider} />
          <div className={styles.metaBlock}>
            <span className={styles.metaLabel}>DATA DE PUBLICAÇÃO</span>
            <span className={styles.metaValue}>{data}</span>
          </div>
          <div className={styles.metaDivider} />
          <div className={styles.metaBlock}>
            <span className={styles.metaLabel}>LEITURA ESTIMADA</span>
            <span className={styles.metaValue}>{leitura} {leitura === 1 ? 'minuto' : 'minutos'}</span>
          </div>
        </div>

        {artigo.cover_image_url && (
          <div className={styles.coverWrap}>
            <img
              src={artigo.cover_image_url}
              alt={artigo.title}
              className={styles.cover}
              style={{ objectPosition: artigo.cover_image_position ?? '50% 50%' }}
            />
          </div>
        )}

        <div className={styles.body}>
          {artigo.content ? (
            <div
              className={styles.content}
              dangerouslySetInnerHTML={{ __html: artigo.content }}
            />
          ) : artigo.summary ? (
            <p className={styles.resumoFallback}>{artigo.summary}</p>
          ) : (
            <p className={styles.empty}>Nenhum conteúdo disponível.</p>
          )}
        </div>

      </article>
    </div>
  );
}
