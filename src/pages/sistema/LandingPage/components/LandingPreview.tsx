import type { CSSProperties } from 'react';
import type { LandingPageData } from '../types';
import styles from '../LandingPage.module.css';

export interface LandingPreviewProps {
  data: LandingPageData;
}

export default function LandingPreview({ data }: LandingPreviewProps) {
  const previewVars = {
    '--pv-button-radius': data.buttonRadius ?? '6px',
    '--pv-bg-primary': data.colorBgPrimary || data.color || '#232C43',
    '--pv-bg-secondary': data.colorBgSecondary || '#F5F3EF',
    '--pv-bg-about': data.colorBgSobre || '#FFFFFF',
    '--pv-button': data.colorButtons || '#661C16',
    '--pv-button-hover': data.colorButtonsHover || '#A52020',
    '--pv-button-text': data.colorButtonsText || '#FFFFFF',
    '--pv-title-primary': data.colorTitlePrimary || '#FFFFFF',
    '--pv-title-secondary': data.colorTitleSecondary || '#232C43',
    '--pv-text-primary': data.colorTextPrimary || '#FFFFFF',
    '--pv-text-secondary': data.colorTextSecondary || '#6B7280',
    '--pv-link-primary': data.colorLinkPrimary || '#FFFFFF',
    '--pv-link-secondary': data.colorLinkSecondary || '#661C16',
  } as CSSProperties;

  const placeholder = '/placeholder.png';
  return (
    <div className={styles.previewFrame}>
      <div className={styles.previewLanding} style={previewVars} data-landing-preview>
        <nav className={styles.pvNav}>
          <a href="#pv-hero"><img src="/logo.png" alt="Vitor França" /></a>
          <div>{['Escritório', 'Diferenciais', 'Áreas', 'Sobre', 'Artigos', 'Contato'].map((item, i) => <a key={item} href={`#pv-${['escritorio', 'diferenciais', 'areas', 'sobre', 'artigos', 'contato'][i]}`}>{item}</a>)}</div>
          <a className={styles.pvButton} href="#pv-contato">Agendar Consulta</a>
        </nav>
        <main>
          <section id="pv-hero" className={styles.pvHero}>
            <div className={styles.pvHeroContent}>
              <div className={styles.pvHeroCopy}>
                <p className={styles.pvKicker}>Advocacia Empresarial</p>
                <h1>{data.heroTitulo || 'Soluções jurídicas para empresas que querem crescer com segurança'}</h1>
                <p>{data.heroSubtexto || 'Assessoria jurídica especializada com foco em resultados práticos e estratégias personalizadas para o seu negócio.'}</p>
                <div className={styles.pvActions}><a className={styles.pvButton} href="#pv-contato">Fale Conosco</a><a className={styles.pvOutline} href="#pv-escritorio">Conheça o Escritório</a></div>
              </div>
              <span className={styles.pvHeroDivider} />
              <img className={styles.pvHeroImage} src={data.heroImagem || placeholder} alt="" style={{ objectPosition: `${data.heroImagemPos.x}% ${data.heroImagemPos.y}%` }} />
            </div>
          </section>
          <section id="pv-escritorio" className={styles.pvLightSection}>
            <div className={styles.pvSplit}>
              <img className={styles.pvOfficeImage} src={data.escritorioImagem || placeholder} alt="" style={{ objectPosition: `${data.escritorioImagemPos.x}% ${data.escritorioImagemPos.y}%` }} />
              <div><p className={styles.pvKickerDark}>O Escritório</p><span className={styles.pvRule} /><h2>{data.escritorioTitulo || 'Excelência jurídica com foco em resultados'}</h2><p>{data.escritorioConteudo || 'O escritório nasceu com o propósito de oferecer soluções jurídicas personalizadas e estratégicas para empresas que buscam crescimento sustentável.'}</p><a className={styles.pvTextLink} href={data.website || '#pv-contato'}>Saiba Mais →</a></div>
            </div>
          </section>
          <section id="pv-diferenciais" className={styles.pvDarkSection}>
            <h2>Nossos Diferenciais</h2><div className={styles.pvDiffGrid}>{data.diferenciais.filter(item => item.titulo || item.descricao).map(item => <article key={item.id}><h3>{item.titulo}</h3><p>{item.descricao}</p></article>)}</div>
          </section>
          <section id="pv-areas" className={styles.pvLightSection}>
            <h2 className={styles.pvCenteredHeading}>Áreas de Atuação</h2><div className={styles.pvAreaGrid}>{data.areas.filter(item => item.titulo || item.descricao).map(item => <article key={item.id}><h3>{item.titulo}</h3><p>{item.descricao}</p></article>)}</div>
          </section>
          <section id="pv-sobre" className={styles.pvAboutSection}>
            <div className={styles.pvAboutSplit}><div className={styles.pvAboutImageWrap}><img src={data.advogadoImagem || '/vitor.png'} alt="" style={{ objectPosition: `${data.advogadoImagemPos.x}% ${data.advogadoImagemPos.y}%` }} /></div><span className={styles.pvAboutDivider} /><div><h2>{data.advogadoTitulo || 'Vitor França'}</h2><p className={styles.pvOab}>{data.advogadoOab || 'OAB/SP 123.456'}</p><p>{data.advogadoConteudo || 'Advogado especializado em Direito Empresarial, com mais de 15 anos de experiência em assessoria jurídica estratégica para empresas de médio e grande porte.'}</p><a className={styles.pvTextLink} href={data.linkedin || '#pv-contato'}>Ver currículo completo →</a></div></div>
          </section>
          <section id="pv-artigos" className={styles.pvDarkSection}><p className={styles.pvKicker}>Publicações</p><h2>Artigos e Notícias</h2><div className={styles.pvArticleGrid}>{['Assessoria jurídica estratégica para empresas', 'Segurança jurídica e crescimento sustentável', 'O que considerar em contratos empresariais'].map(title => <article key={title}><p>Publicação recente</p><h3>{title}</h3><a href="#pv-artigos">Leia mais →</a></article>)}</div></section>
          <section id="pv-contato" className={styles.pvLightSection}><div className={styles.pvContactGrid}><div><h2>Entre em Contato</h2><p>ENDEREÇO</p><p>{data.endereco || 'Av. Paulista, 1.500 - 10º andar\nBela Vista, São Paulo - SP\nCEP 01310-100'}</p><p>E-MAIL</p><p>{data.email || 'contato@vitorfranca.adv.br'}</p><p>TELEFONE</p><p>{data.telefone || '(11) 3456-7890'}</p><a className={styles.pvButton} href={data.whatsapp || '#pv-contato'}>Falar no WhatsApp</a></div><div className={styles.pvForm}><label>Nome<input readOnly placeholder="Seu nome" /></label><label>E-mail<input readOnly placeholder="seu@email.com" /></label><label>Telefone<input readOnly placeholder="(11) 99999-9999" /></label><label>Mensagem<textarea readOnly placeholder="Como podemos ajudar?" /></label><p>Li e concordo com o Termo de Consentimento.</p><button className={styles.pvButton} type="button">Enviar Mensagem</button></div></div></section>
        </main>
        <footer className={styles.pvFooter}><div><img src="/logo.png" alt="Vitor França" /><p>© 2026 Vitor França. Todos os direitos reservados.</p></div><nav>{['Escritório', 'Diferenciais', 'Áreas', 'Sobre', 'Artigos', 'Contato'].map((item, i) => <a key={item} href={`#pv-${['escritorio', 'diferenciais', 'areas', 'sobre', 'artigos', 'contato'][i]}`}>{item}</a>)}</nav><div>{data.linkedin && <a href={data.linkedin}>LinkedIn</a>}{data.instagram && <a href={data.instagram}>Instagram</a>}</div></footer>
      </div>
    </div>
  );
}
