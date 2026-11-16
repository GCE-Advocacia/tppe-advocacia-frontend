import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const playwrightModule = process.env.PLAYWRIGHT_MODULE_PATH;
const { chromium } = await import(playwrightModule ? pathToFileURL(playwrightModule).href : 'playwright');
const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

let browser;
let server;
let baseURL;

before(async () => {
  server = await createServer({
    root: projectRoot,
    server: { host: '127.0.0.1', port: 0, open: false },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://api.content.test/api/v1') },
    logLevel: 'error',
  });
  await server.listen();
  baseURL = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

function createMockConfig(overrides = {}) {
  return {
    id: 1,
    office_name: 'França & Advogados Associados',
    cnpj: '12.345.678/0001-99',
    address: 'Av. Paulista, 1500 - 10º andar\nSão Paulo - SP',
    phone: '(11) 3456-7890',
    email: 'contato@franca.adv.br',
    instagram_url: 'https://instagram.com/franca.adv',
    linkedin_url: 'https://linkedin.com/in/vitorfranca',
    whatsapp_url: 'https://wa.me/5511999999999',
    website_url: 'https://franca.adv.br',
    hero_title: 'Excelência Jurídica para Empresas em Crescimento',
    hero_subtitle: 'Assessoria jurídica empresarial especializada e estratégica.',
    hero_image_url: 'http://assets.content.test/hero.png',
    hero_image_position: '25, 75',
    about_title: 'Tradição e Inovação no Direito Corporativo',
    about_description: 'Mais de duas décadas defendendo interesses corporativos com ética e eficiência.',
    about_image_url: 'http://assets.content.test/office.png',
    about_image_position: '10, 90',
    lawyer_name: 'Dr. Vitor França',
    lawyer_oab: 'OAB/SP 123.456',
    lawyer_description: 'Especialista em Direito Societário e M&A pela USP com sólida atuação contenciosa.',
    lawyer_image_url: 'http://assets.content.test/lawyer.png',
    lawyer_image_position: '80, 20',
    differentials: [
      { title: 'Atendimento Consultivo', description: 'Atuação próxima às lideranças da empresa.' },
      { title: 'Agilidade Operacional', description: 'Respostas em menos de 24 horas úteis.' },
      { title: 'Visão Estratégica', description: 'Foco no impacto financeiro de cada decisão jurídica.' },
    ],
    areas_of_practice: [
      { title: 'Direito Societário', description: 'Estruturação societária e acordos de acionistas.' },
      { title: 'Fusões e Aquisições', description: 'Due diligence completa e contratos de compra e venda.' },
      { title: 'Contratos Comerciais', description: 'Elaboração e negociação de contratos complexos.' },
      { title: 'Compliance Empresarial', description: 'Programas de integridade e mitigação de riscos.' },
      { title: 'Trabalhista Preventivo', description: 'Auditoria de passivos e adequação de rotinas.' },
      { title: 'Tributário Estratégico', description: 'Planejamento e recuperação de créditos tributários.' },
    ],
    button_radius: '6px',
    color: '#232C43',
    color_bg_primary: '#232C43',
    color_bg_secondary: '#F5F3EF',
    color_bg_sobre: '#FFFFFF',
    color_buttons: '#661C16',
    color_buttons_hover: '#A52020',
    color_buttons_text: '#FFFFFF',
    color_title_primary: '#FFFFFF',
    color_title_secondary: '#232C43',
    color_text_primary: '#FFFFFF',
    color_text_secondary: '#6B7280',
    color_link_primary: '#FFFFFF',
    color_link_secondary: '#661C16',
    theme_id: null,
    system_uses_landing_buttons: true,
    color_buttons_system: null,
    color_buttons_system_hover: null,
    color_buttons_system_text: null,
    logo_url: null,
    logo_dark_url: null,
    system_logo_url: null,
    system_logo_dark_url: null,
    favicon_url: null,
    default_logo_url: null,
    default_logo_dark_url: null,
    default_system_logo_url: null,
    default_system_logo_dark_url: null,
    default_favicon_url: null,
    logo_same_for_themes: true,
    system_logo_same_for_themes: true,
    system_uses_landing_logo: true,
    ...overrides,
  };
}

async function setup(t, { role = 'ADMIN', configOverrides = {}, viewport = { width: 1440, height: 1000 } } = {}) {
  const context = await browser.newContext({ viewport });
  context.setDefaultTimeout(10_000);
  context.setDefaultNavigationTimeout(30_000);
  t.after(() => context.close());

  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  t.after(() => assert.deepEqual(errors, [], 'Sem erros no console do navegador'));

  if (role) {
    const token = `test.${Buffer.from(JSON.stringify({ sub: '1', role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
    await context.addInitScript(({ token, origin }) => {
      if (location.origin === origin) localStorage.setItem('advocacia_access_token', token);
    }, { token, origin: baseURL });
  }

  const state = {
    config: createMockConfig(configOverrides),
    updates: [],
    uploads: [],
    uploadReject: null,
    patchStatus: 200,
    patchError: null,
  };

  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.origin === baseURL) return route.continue();
    if (url.hostname !== 'api.content.test') return route.abort();

    const respond = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(status < 400 ? { success: true, data, meta: { total: 0, page: 1, limit: 20, pages: 0 } } : data),
      });

    if (url.pathname === '/api/v1/office-config') {
      if (request.method() === 'PATCH') {
        const payload = request.postDataJSON();
        state.updates.push(payload);
        if (state.patchStatus !== 200) {
          return respond(state.patchError || { error: { code: 'INTERNAL_ERROR', message: 'Erro ao salvar.' } }, state.patchStatus);
        }
        state.config = { ...state.config, ...payload };
        return respond(state.config);
      }
      return respond(state.config);
    }

    if (url.pathname === '/api/v1/media/upload' && request.method() === 'POST') {
      state.uploads.push(request);
      if (state.uploadReject) {
        return respond(state.uploadReject, 400);
      }
      return respond({ url: `http://assets.content.test/upload-${state.uploads.length}.png` }, 201);
    }

    if (url.pathname.includes('themes')) {
      return respond([]);
    }

    return respond([]);
  });

  const page = await context.newPage();
  return { page, context, state };
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-S3-04: UI Playwright — US17 Preview Multi-Dispositivo
// ─────────────────────────────────────────────────────────────────────────────
test('TC-S3-04: Preview Multi-Dispositivo (Desktop, Tablet e Mobile) altera molduras e preserva rascunhos', async t => {
  const { page } = await setup(t);
  await page.goto(`${baseURL}/sistema/personalizacao?tab=identidade`);

  const previewToolbar = page.locator('[aria-label="Tamanho da prévia"]');
  await previewToolbar.waitFor();

  const btnDesktop = previewToolbar.getByRole('button', { name: 'Desktop' });
  const btnTablet = previewToolbar.getByRole('button', { name: 'Tablet' });
  const btnMobile = previewToolbar.getByRole('button', { name: 'Mobile' });

  // 1. Desktop inicia ativo
  assert.equal(await btnDesktop.getAttribute('aria-pressed'), 'true');
  assert.equal(await btnTablet.getAttribute('aria-pressed'), 'false');
  assert.equal(await btnMobile.getAttribute('aria-pressed'), 'false');
  const stage = page.locator('[class*="previewStage"]').first();
  assert.ok((await stage.getAttribute('class')).includes('previewStageDesktop'));

  // 2. Alterna para Tablet
  await btnTablet.click();
  await page.waitForTimeout(300);
  assert.equal(await btnDesktop.getAttribute('aria-pressed'), 'false');
  assert.equal(await btnTablet.getAttribute('aria-pressed'), 'true');
  assert.ok((await stage.getAttribute('class')).includes('previewStageTablet'));

  const tabletBox = await stage.boundingBox();
  assert.ok(tabletBox.width <= 768, `Tablet width deve ser <= 768px, obtido: ${tabletBox.width}`);

  // 3. Alterna para Mobile
  await btnMobile.click();
  await page.waitForTimeout(300);
  assert.equal(await btnMobile.getAttribute('aria-pressed'), 'true');
  assert.ok((await stage.getAttribute('class')).includes('previewStageMobile'));

  const mobileBox = await stage.boundingBox();
  assert.equal(Math.round(mobileBox.width), 401, 'Moldura mobile deve ter width de 401px');

  const mobileFrame = stage.locator('[class*="previewFrame"]');
  const frameBox = await mobileFrame.boundingBox();
  assert.equal(Math.round(frameBox.height), 640, 'Altura interna do previewFrame mobile deve ser 640px');

  // 4. Edita rascunho de curvatura na aba identidade e confirma que alterna de volta para Desktop preservando o rascunho
  const pillBtn = page.getByRole('button', { name: 'Pílula (999px)' });
  await pillBtn.click();

  // Verifica que o preview reflete o rascunho de 999px
  const pvButton = page.locator('[data-landing-preview] [class*="pvButton"]').first();
  assert.equal(await pvButton.evaluate(el => getComputedStyle(el).borderTopLeftRadius), '999px');

  // Alterna entre Tablet, Mobile e Desktop mantendo o raio em 999px
  await btnTablet.click();
  assert.equal(await pvButton.evaluate(el => getComputedStyle(el).borderTopLeftRadius), '999px');

  await btnDesktop.click();
  assert.equal(await pvButton.evaluate(el => getComputedStyle(el).borderTopLeftRadius), '999px');

  // Descartar restaura o valor salvo
  await page.getByRole('button', { name: 'Descartar', exact: true }).click();
  assert.equal(await pvButton.evaluate(el => getComputedStyle(el).borderTopLeftRadius), '6px');
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-S3-05: UI Playwright — Edição Inline dos Cards e Reflexo no LandingPreview
// ─────────────────────────────────────────────────────────────────────────────
test('TC-S3-05: Edição inline de Diferenciais e Áreas de Atuação reflete em tempo real no LandingPreview e salva payload', async t => {
  const { page, state } = await setup(t);

  // Acessa a Aba 2 (Conteúdo)
  await page.goto(`${baseURL}/sistema/personalizacao?tab=conteudo`);

  // Edita o 1º Diferencial
  const difCard = page.locator('[data-section="Diferenciais"]');
  await difCard.waitFor();
  const editDifBtn = difCard.locator('button').first();
  await editDifBtn.click();

  const difTitleInput = difCard.locator('input').first();
  const difDescInput = difCard.locator('textarea').first();
  await difTitleInput.fill('Diferencial Playwright Exclusivo');
  await difDescInput.fill('Descrição detalhada do diferencial testado via Playwright.');
  // Confirma inline (botão com check verde)
  await difCard.locator('button:has(svg)').first().click();

  // Edita a 1ª Área de Atuação
  const areaCard = page.locator('[data-section="Áreas de Atuação"]');
  await areaCard.waitFor();
  const editAreaBtn = areaCard.locator('button').first();
  await editAreaBtn.click();

  const areaTitleInput = areaCard.locator('input').first();
  const areaDescInput = areaCard.locator('textarea').first();
  await areaTitleInput.fill('Direito Digital & IA');
  await areaDescInput.fill('Consultoria avançada em inteligência artificial e privacidade.');
  await areaCard.locator('button:has(svg)').first().click();

  // Alterna para a Aba 1 (Identidade) e valida se o LandingPreview reflete os novos textos em tempo real
  await page.getByRole('tab', { name: /Identidade Visual/i }).click();

  const preview = page.locator('[data-landing-preview]');
  await preview.waitFor();
  assert.ok(await preview.locator('text=Diferencial Playwright Exclusivo').isVisible(), 'Diferencial editado deve aparecer no LandingPreview');
  assert.ok(await preview.locator('text=Direito Digital & IA').isVisible(), 'Área de Atuação editada deve aparecer no LandingPreview');

  // Salva alterações
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await page.locator('[data-pending-changes="false"]').waitFor({ state: 'attached' });

  // Valida payload enviado à API
  assert.equal(state.updates.length, 1);
  const sentPayload = state.updates[0];
  assert.equal(sentPayload.differentials[0].title, 'Diferencial Playwright Exclusivo');
  assert.equal(sentPayload.differentials[0].description, 'Descrição detalhada do diferencial testado via Playwright.');
  assert.equal(sentPayload.areas_of_practice[0].title, 'Direito Digital & IA');
  assert.equal(sentPayload.areas_of_practice[0].description, 'Consultoria avançada em inteligência artificial e privacidade.');
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-S3-06: UI Playwright — ImageUpload + ImagePositionModal (x%, y%)
// ─────────────────────────────────────────────────────────────────────────────
test('TC-S3-06: ImageUpload e ImagePositionModal permite ajustar foco x%, y%, cancelar e confirmar persistindo posições', async t => {
  const { page, state } = await setup(t);
  await page.goto(`${baseURL}/sistema/personalizacao?tab=conteudo`);

  const heroCard = page.locator('[data-section="Hero (Destaque Principal)"]');
  await heroCard.waitFor();

  // Clica no botão "Reposicionar" do Hero
  const repoBtn = heroCard.getByRole('button', { name: 'Reposicionar' });
  await repoBtn.click();

  // Modal de reposicionamento abre
  const modal = page.locator('[data-testid="image-position-modal"]');
  await modal.waitFor();
  assert.ok(await modal.getByText('Reposicionar imagem').isVisible());

  // Testa botão "Cancelar" (fecha sem alterar)
  await modal.getByRole('button', { name: 'Cancelar' }).click();
  await modal.waitFor({ state: 'detached' });

  // Abre novamente o modal
  await repoBtn.click();
  await modal.waitFor();

  // Simula clique/arrasto na moldura
  const frame = modal.locator('[data-testid="image-position-frame"]');
  const frameBox = await frame.boundingBox();
  await page.mouse.move(frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(frameBox.x + frameBox.width / 2 + 50, frameBox.y + frameBox.height / 2 + 50);
  await page.mouse.up();

  // Confirma nova posição
  await modal.getByRole('button', { name: 'Confirmar' }).click();
  await modal.waitFor({ state: 'detached' });

  // Alterna para aba 1 e salva
  await page.getByRole('tab', { name: /Identidade Visual/i }).click();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await page.locator('[data-pending-changes="false"]').waitFor({ state: 'attached' });

  assert.equal(state.updates.length, 1);
  const updatedHeroPos = state.updates[0].hero_image_position;
  assert.ok(updatedHeroPos !== '25, 75', `Posição do Hero deve ter mudado após o drag. Atual: ${updatedHeroPos}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-S3-07: UI Playwright — Validação Client-Side de Erros no ImageUpload
// ─────────────────────────────────────────────────────────────────────────────
test('TC-S3-07: Upload de formato inválido (.pdf) ou arquivo > 5MB exibe mensagem imediata sem chamar API', async t => {
  const { page, state } = await setup(t);
  await page.goto(`${baseURL}/sistema/personalizacao?tab=conteudo`);

  const heroCard = page.locator('[data-section="Hero (Destaque Principal)"]');
  await heroCard.waitFor();
  const fileInput = heroCard.locator('input[type="file"]');

  // 1. Tenta subir arquivo com extensão inválida
  await fileInput.setInputFiles({
    name: 'documento.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 mock content'),
  });

  const errorMsg = heroCard.locator('text=Formato inválido. Use PNG, JPG ou WEBP.');
  await errorMsg.waitFor();
  assert.equal(state.uploads.length, 0, 'API de upload NÃO deve ser chamada para formato inválido');

  // 2. Tenta subir arquivo PNG maior que 5MB (5.5MB)
  const bigBuffer = Buffer.alloc(5.5 * 1024 * 1024);
  await fileInput.setInputFiles({
    name: 'imagem_gigante.png',
    mimeType: 'image/png',
    buffer: bigBuffer,
  });

  const sizeErrorMsg = heroCard.locator('text=A imagem deve ter no máximo 5MB.');
  await sizeErrorMsg.waitFor();
  assert.equal(state.uploads.length, 0, 'API de upload NÃO deve ser chamada para arquivo > 5MB');
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-S3-08: UI Playwright — Tratamento de Erro ao Salvar URL Inválida na Seção Links
// ─────────────────────────────────────────────────────────────────────────────
test('TC-S3-08: Tratamento de erro 422 ao salvar URL inválida exibe alerta na barra inferior e mantém rascunho', async t => {
  const { page, state } = await setup(t);
  await page.goto(`${baseURL}/sistema/personalizacao?tab=conteudo`);

  const linksCard = page.locator('[data-section="Links"]');
  await linksCard.waitFor();

  const linkedinInput = linksCard.locator('input').first();
  await linkedinInput.fill('linkedin.com/sem-protocolo');

  // Configura a API para rejeitar com 422
  state.patchStatus = 422;
  state.patchError = { error: { code: 'VALIDATION_ERROR', message: 'URL inválida.' } };

  // Clica em Salvar alterações
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  // Verifica exibição do alerta na barra inferior
  const alert = page.locator('[role="alert"]');
  await alert.waitFor();
  assert.ok(await alert.textContent(), 'URL inválida.');

  // Confirma que o formulário permanece editável com o rascunho preservado
  assert.equal(await linkedinInput.inputValue(), 'linkedin.com/sem-protocolo');

  // Corrige a URL e permite que a API responda com 200
  state.patchStatus = 200;
  state.patchError = null;
  await linkedinInput.fill('https://linkedin.com/in/corrigido');

  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await page.locator('[data-pending-changes="false"]').waitFor({ state: 'attached' });

  assert.equal(state.updates.length, 2);
  assert.equal(state.updates[1].linkedin_url, 'https://linkedin.com/in/corrigido');
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-S3-09: UI Playwright — Renderização Completa na Landing Page Pública (/)
// ─────────────────────────────────────────────────────────────────────────────
test('TC-S3-09: Landing Page pública (/) renderiza todas as 7 seções, imagens, posições x%/y%, links e modal LGPD', async t => {
  const customConfig = {
    hero_title: 'Advocacia de Alta Performance e Estratégia',
    hero_subtitle: 'Defendendo grandes empresas com precisão jurídica.',
    hero_image_url: 'http://assets.content.test/hero-custom.png',
    hero_image_position: '30, 70',
    about_title: 'Sobre Nosso Escritório Corporativo',
    about_description: 'Atuação full-service com inteligência empresarial.',
    about_image_url: 'http://assets.content.test/office-custom.png',
    about_image_position: '20, 80',
    lawyer_name: 'Dr. Gabriel Fernando',
    lawyer_oab: 'OAB/DF 99.888',
    lawyer_description: 'Advogado líder em litígios societários complexos.',
    lawyer_image_url: 'http://assets.content.test/lawyer-custom.png',
    lawyer_image_position: '85, 15',
    differentials: [
      { title: 'Diferencial Alfa', description: 'Descrição Alfa.' },
      { title: 'Diferencial Beta', description: 'Descrição Beta.' },
      { title: 'Diferencial Gama', description: 'Descrição Gama.' },
    ],
    areas_of_practice: [
      { title: 'Área 1', description: 'Desc 1' },
      { title: 'Área 2', description: 'Desc 2' },
      { title: 'Área 3', description: 'Desc 3' },
      { title: 'Área 4', description: 'Desc 4' },
      { title: 'Área 5', description: 'Desc 5' },
      { title: 'Área 6', description: 'Desc 6' },
    ],
    button_radius: '12px',
    color_buttons: '#B91C1C',
  };

  const { page } = await setup(t, { role: null, configOverrides: customConfig });
  await page.goto(baseURL);

  // 1. Navbar
  const navbar = page.locator('nav');
  await navbar.waitFor();
  assert.ok(await navbar.getByRole('link', { name: 'Escritório' }).isVisible());
  assert.ok(await navbar.getByRole('link', { name: 'Agendar Consulta' }).isVisible());

  // 2. Hero
  const heroSection = page.locator('#hero');
  await heroSection.waitFor();
  assert.ok(await heroSection.locator('text=Advocacia de Alta Performance e Estratégia').isVisible());
  assert.ok(await heroSection.locator('text=Defendendo grandes empresas com precisão jurídica.').isVisible());
  const heroImg = heroSection.locator('img');
  assert.equal(await heroImg.getAttribute('src'), 'http://assets.content.test/hero-custom.png');
  assert.equal(await heroImg.evaluate(el => el.style.objectPosition), '30% 70%');

  // 3. Sobre Escritório
  const escritorioSection = page.locator('#escritorio');
  await escritorioSection.waitFor();
  assert.ok(await escritorioSection.locator('text=Sobre Nosso Escritório Corporativo').isVisible());
  const officeImg = escritorioSection.locator('img');
  assert.equal(await officeImg.getAttribute('src'), 'http://assets.content.test/office-custom.png');
  assert.equal(await officeImg.evaluate(el => el.style.objectPosition), '20% 80%');

  // 4. Diferenciais (3 cards)
  const diffSection = page.locator('#diferenciais');
  await diffSection.waitFor();
  assert.ok(await diffSection.locator('text=Diferencial Alfa').isVisible());
  assert.ok(await diffSection.locator('text=Diferencial Beta').isVisible());
  assert.ok(await diffSection.locator('text=Diferencial Gama').isVisible());

  // 5. Áreas de Atuação (6 cards)
  const areasSection = page.locator('#areas');
  await areasSection.waitFor();
  for (let i = 1; i <= 6; i++) {
    assert.ok(await areasSection.locator(`text=Área ${i}`).isVisible(), `Área ${i} deve ser renderizada na LP`);
  }

  // 6. Sobre Advogado
  const sobreSection = page.locator('#sobre');
  await sobreSection.waitFor();
  assert.ok(await sobreSection.locator('text=Dr. Gabriel Fernando').isVisible());
  assert.ok(await sobreSection.locator('text=OAB/DF 99.888').isVisible());
  const lawyerImg = sobreSection.locator('img');
  assert.equal(await lawyerImg.getAttribute('src'), 'http://assets.content.test/lawyer-custom.png');
  assert.equal(await lawyerImg.evaluate(el => el.style.objectPosition), '85% 15%');

  // 7. Contato e Modal LGPD
  const contatoSection = page.locator('#contato');
  await contatoSection.waitFor();
  assert.ok(await contatoSection.locator('text=contato@franca.adv.br').isVisible());
  assert.ok(await contatoSection.locator('text=(11) 3456-7890').isVisible());

  // Abre Modal LGPD
  const termoBtn = contatoSection.getByRole('button', { name: 'Termo de Consentimento' });
  await termoBtn.click();

  const lgpdModal = page.locator('#contato [role="dialog"]');
  await lgpdModal.waitFor();
  assert.ok(await lgpdModal.locator('text=Termo de Consentimento para Tratamento de Dados Pessoais').isVisible());
  assert.ok(await lgpdModal.locator('text=França & Advogados Associados').isVisible());

  // Clica em "Entendi e aceito os termos"
  await lgpdModal.getByRole('button', { name: 'Entendi e aceito os termos' }).click();
  await lgpdModal.waitFor({ state: 'detached' });

  // Verifica que o checkbox de consentimento foi marcado automaticamente
  const checkbox = contatoSection.locator('input[type="checkbox"][name="consentimento"]');
  assert.equal(await checkbox.isChecked(), true);

  // 8. Footer
  const footer = page.locator('footer');
  await footer.waitFor();
  assert.ok(await footer.locator('text=OAB/DF 99.888').isVisible());
  assert.ok(await footer.getByRole('link', { name: 'LinkedIn' }).isVisible());
  assert.ok(await footer.getByRole('link', { name: 'Instagram' }).isVisible());

  // 9. Tokens de estilo no :root
  const rootRadius = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--btn-radius').trim());
  assert.equal(rootRadius, '12px');
});
