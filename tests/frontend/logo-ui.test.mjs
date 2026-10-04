import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';

// An optional external Playwright installation avoids changing production dependencies.
const playwrightModule = process.env.PLAYWRIGHT_MODULE_PATH;
const { chromium } = await import(playwrightModule ? pathToFileURL(playwrightModule).href : 'playwright');
const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const image = await readFile(new URL('../../public/logo.png', import.meta.url));
const oldLogo = 'http://assets.logo.test/original.png';
const slots = { 'landing-light': 'logo_url', 'landing-dark': 'logo_dark_url', 'system-light': 'system_logo_url', 'system-dark': 'system_logo_dark_url', favicon: 'favicon_url' };
const asset = (page, slot = 'landing-light') => page.locator(`[data-logo-slot="${slot}"]`);
const logoSelector = 'img[alt="Logo de Teste Advocacia"]';
let browser;
let server;
let baseURL;

before(async () => {
  server = await createServer({
    root: projectRoot,
    server: { host: '127.0.0.1', port: 0, open: false },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://api.logo.test/api/v1') },
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

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function setup(t, { role = 'ADMIN', logo = oldLogo, viewport = { width: 1280, height: 1000 } } = {}) {
  const context = await browser.newContext({ viewport });
  context.setDefaultTimeout(10_000);
  t.after(() => context.close());
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  t.after(() => assert.deepEqual(errors, [], 'The application should not throw browser errors'));
  const token = role ? `test.${Buffer.from(JSON.stringify({ sub: '1', role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test` : null;
  if (token) {
    await context.addInitScript(({ value, origin }) => {
      if (location.origin === origin) localStorage.setItem('advocacia_access_token', value);
    }, { value: token, origin: baseURL });
  }
  const state = {
    config: { id: 1, office_name: 'Teste Advocacia', default_logo_url: null, default_logo_dark_url: null, default_system_logo_url: null, default_system_logo_dark_url: null, default_favicon_url: null, logo_url: logo, logo_dark_url: null, system_logo_url: null, system_logo_dark_url: null, favicon_url: null, logo_same_for_themes: true, system_logo_same_for_themes: true, system_uses_landing_logo: true, differentials: [], areas_of_practice: [] },
    uploads: [],
    previews: [],
    resets: 0,
    defaults: [],
    defaultFailure: false,
    preferenceUpdates: [],
    generalUpdates: [],
    generalFailure: false,
    failureSlot: null,
    previewFailure: false,
    resetFailure: false,
    preferenceFailure: false,
    failure: null,
    uploadGate: null,
    previewGate: null,
    configGate: null,
    missingImage: false,
  };
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === baseURL) return route.continue();
    if (url.hostname === 'assets.logo.test') {
      return route.fulfill({ status: state.missingImage ? 404 : 200, contentType: 'image/png', body: state.missingImage ? '' : image });
    }
    if (url.hostname !== 'api.logo.test') return route.abort();
    const respond = (data, status = 200) => route.fulfill({
      status, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(status < 400 ? { success: true, data, meta: { total: 0, page: 1, limit: 20, pages: 0 } } : data),
    });
    const slot = url.searchParams.get('slot') || 'landing-light';
    if (url.pathname === '/api/v1/office-config/logo' && request.method() === 'PATCH') {
      state.preferenceUpdates.push(request.postDataJSON());
      if (state.preferenceFailure) return respond({ error: { code: 'INTERNAL_ERROR' } }, 500);
      state.config = { ...state.config, ...request.postDataJSON() };
      return respond(state.config);
    }
    if (url.pathname === '/api/v1/office-config/logo/default') {
      state.defaults.push(slot);
      if (state.defaultFailure) return respond({ error: { code: 'INTERNAL_ERROR' } }, 500);
      state.config = { ...state.config, [`default_${slots[slot]}`]: state.config[slots[slot]] };
      return respond(state.config);
    }
    if (url.pathname === '/api/v1/office-config/logo/preview') {
      assert.equal(request.method(), 'POST');
      state.previews.push(request);
      if (state.previewGate) await state.previewGate.promise;
      if (state.previewFailure || request.postDataBuffer().includes(Buffer.from('not an image'))) return respond({ error: { code: 'INVALID_LOGO_IMAGE' } }, 422);
      return route.fulfill({ contentType: 'image/png', body: image });
    }
    if (url.pathname === '/api/v1/office-config/logo' && request.method() === 'DELETE') {
      state.resets++;
      if (state.resetFailure) return respond({ error: { code: 'INTERNAL_ERROR' } }, 500);
      state.config = { ...state.config, [slots[slot]]: url.searchParams.get('factory') === 'true' ? null : state.config[`default_${slots[slot]}`] };
      if (url.searchParams.get('factory') === 'true') state.config[`default_${slots[slot]}`] = null;
      return respond(state.config);
    }
    if (url.pathname === '/api/v1/office-config/logo') {
      assert.equal(request.method(), 'PUT');
      state.uploads.push(request);
      if (state.uploadGate) await state.uploadGate.promise;
      if (state.failure && (!state.failureSlot || state.failureSlot === slot)) return respond({ error: { code: state.failure } }, 422);
      state.config = { ...state.config, [slots[slot]]: `http://assets.logo.test/${slot}-${state.uploads.length}.png` };
      if (/name="make_default"\r\n\r\ntrue/.test(request.postDataBuffer().toString('latin1'))) state.config[`default_${slots[slot]}`] = state.config[slots[slot]];
      return respond(state.config);
    }
    if (url.pathname === '/api/v1/office-config') {
      if (request.method() === 'PATCH') {
        state.generalUpdates.push(request.postDataJSON());
        if (state.generalFailure) return respond({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao salvar formulário.' } }, 500);
        state.config = { ...state.config, ...request.postDataJSON() };
        return respond(state.config);
      }
      const snapshot = { ...state.config };
      if (state.configGate) {
        const gate = state.configGate;
        state.configGate = null;
        gate.started.resolve();
        await gate.release.promise;
        await respond(snapshot);
        gate.finished.resolve();
        return;
      }
      return respond(snapshot);
    }
    if (url.pathname === '/api/v1/articles/1') {
      return respond({ id: 1, title: 'Artigo de teste', content: '<p>Conteúdo.</p>', author_name: 'Advogado', created_at: '2026-10-03T12:00:00Z' });
    }
    return respond([]);
  });
  const page = await context.newPage();
  return { page, context, state, token };
}

async function openSettings(page) {
  await page.goto(`${baseURL}/sistema/landing-page`);
  await page.getByRole('heading', { name: 'Logos e ícone do navegador' }).waitFor();
}

const saveButton = page => page.getByRole('button', { name: 'Salvar alterações', exact: true });
const bar = page => page.locator('[data-pending-changes]');

async function chooseImage(page, name = 'minha-logo.png', slot = 'landing-light') {
  await asset(page, slot).locator('input[type="file"]').setInputFiles({ name, mimeType: 'image/png', buffer: image });
  await page.waitForFunction(slot => {
    const image = document.querySelector(`[data-logo-slot="${slot}"] img[src^="blob:"]`);
    return image?.complete && image.naturalWidth > 0;
  }, slot);
}

async function saveAll(page) {
  await saveButton(page).click();
  await page.locator('[data-pending-changes="false"]').waitFor({ state: 'attached' });
}

async function discardAll(page) {
  await page.getByRole('button', { name: 'Descartar', exact: true }).click();
  await page.locator('[data-pending-changes="false"]').waitFor({ state: 'attached' });
}

async function expectLogo(page, url, count) {
  await page.waitForFunction(({ selector, source, expectedCount }) => {
    const images = [...document.querySelectorAll(selector)];
    return images.length === expectedCount && images.every(img => img.src === source && img.complete && img.naturalWidth > 0);
  }, { selector: logoSelector, source: url, expectedCount: count });
}

test('validates files and blocks the shared save action when a preview fails', async t => {
  const { page, state } = await setup(t);
  await openSettings(page);
  const input = asset(page).locator('input[type="file"]');
  for (const [file, message] of [
    [{ name: 'logo.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') }, 'Formato não permitido'],
    [{ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.alloc(0) }, 'arquivo está vazio'],
    [{ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }, 'no máximo 5 MB'],
    [{ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from('not an image') }, 'Imagem inválida'],
  ]) {
    await input.setInputFiles(file);
    await page.getByRole('alert').filter({ hasText: message }).waitFor();
    assert.equal(await saveButton(page).isDisabled(), true);
    await expectLogo(page, oldLogo, 1);
  }
  assert.equal(state.uploads.length, 0);
  assert.equal(await page.getByRole('button', { name: /Salvar (logo|ícone)/ }).count(), 0);
  await discardAll(page);
  assert.equal(await page.getByRole('alert').count(), 0);
});

test('all images and sharing choices remain drafts until the bottom bar saves or discards them', async t => {
  const { page, context, state } = await setup(t);
  await openSettings(page);
  const landing = await context.newPage();
  await landing.goto(baseURL);
  await expectLogo(landing, oldLogo, 2);
  await chooseImage(page);
  assert.equal(await bar(page).getAttribute('data-pending-changes'), 'true');
  await page.getByRole('checkbox', { name: 'Usar as logos da landing page no sistema' }).uncheck();
  await chooseImage(page, 'sistema.png', 'system-light');
  await chooseImage(page, 'icone.png', 'favicon');
  assert.equal(state.uploads.length, 0);
  assert.equal(state.preferenceUpdates.length, 0);
  assert.equal(state.resets, 0);
  await expectLogo(page, oldLogo, 1);
  await expectLogo(landing, oldLogo, 2);
  await discardAll(page);
  assert.equal(await page.locator('img[src^="blob:"]').count(), 0);
  assert.equal(await page.getByRole('checkbox', { name: 'Usar as logos da landing page no sistema' }).isChecked(), true);
  assert.equal(state.uploads.length, 0);
  assert.equal(state.preferenceUpdates.length, 0);
});

test('saves a logo using the existing bar, locks controls, and persists across reload and public tabs', async t => {
  const { page, state, token, context } = await setup(t);
  await openSettings(page);
  const landing = await context.newPage();
  await landing.goto(baseURL);
  await expectLogo(landing, oldLogo, 2);
  await chooseImage(page);
  state.uploadGate = deferred();
  await saveButton(page).click();
  await page.getByRole('button', { name: 'Salvando...', exact: true }).waitFor();
  assert.equal(await asset(page).getByRole('button', { name: 'Substituir imagem' }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Descartar', exact: true }).isDisabled(), true);
  state.uploadGate.resolve();
  await page.locator('[data-pending-changes="false"]').waitFor({ state: 'attached' });
  assert.equal(state.uploads.length, 1);
  assert.equal(state.generalUpdates.length, 0, 'An image-only change should not rewrite unrelated form fields');
  assert.equal(state.uploads[0].headers().authorization, `Bearer ${token}`);
  assert.match(state.uploads[0].headers()['content-type'], /^multipart\/form-data; boundary=/);
  assert.match(state.uploads[0].postDataBuffer().toString('latin1'), /name="file"; filename="minha-logo.png"/);
  await expectLogo(page, state.config.logo_url, 1);
  await expectLogo(landing, state.config.logo_url, 2);
  await chooseImage(page, 'segunda-logo.png');
  await saveAll(page);
  assert.equal(state.uploads.length, 2);
  await page.reload();
  await expectLogo(page, state.config.logo_url, 1);
  for (const [path, count] of [['/', 2], ['/login', 1], ['/reset-password', 1], ['/artigos/1', 1]]) {
    await page.goto(`${baseURL}${path}`);
    await expectLogo(page, state.config.logo_url, count);
  }
});

test('saves all five image slots, theme choices and existing form fields in one action', async t => {
  const { page, state } = await setup(t);
  await openSettings(page);
  assert.equal(await page.getByText('Remover fundo uniforme').count(), 0);
  await page.getByRole('checkbox', { name: 'Usar as logos da landing page no sistema' }).uncheck();
  await page.getByRole('checkbox', { name: 'Usar a mesma logo nos fundos claro e escuro da landing page' }).uncheck();
  await page.getByRole('checkbox', { name: 'Usar a mesma logo nos fundos claro e escuro do sistema' }).uncheck();
  for (const slot of Object.keys(slots)) await chooseImage(page, `${slot}.png`, slot);
  await page.locator('input:not([type])').first().fill('contato@novo.test');
  assert.equal(state.uploads.length, 0);
  assert.equal(state.preferenceUpdates.length, 0);
  assert.equal(state.generalUpdates.length, 0);
  await saveAll(page);
  assert.equal(state.uploads.length, 5);
  assert.equal(state.preferenceUpdates.length, 1);
  assert.equal(state.generalUpdates.length, 1);
  assert.equal(state.config.email, 'contato@novo.test');
  assert.equal(state.config.system_uses_landing_logo, false);
  assert.equal(state.config.logo_same_for_themes, false);
  assert.equal(state.config.system_logo_same_for_themes, false);
  const saved = { ...state.config };
  await expectLogo(page, saved.system_logo_dark_url, 1);
  await page.reload();
  await expectLogo(page, saved.system_logo_dark_url, 1);
  for (const [path, source, count] of [
    ['/', saved.logo_dark_url, 2], ['/login', saved.system_logo_url, 1],
    ['/reset-password', saved.system_logo_url, 1], ['/artigos/1', saved.logo_url, 1],
  ]) {
    await page.goto(`${baseURL}${path}`);
    await expectLogo(page, source, count);
  }
  for (const color of ['#FFFFFF', 'rgb(255, 255, 255)', 'hsl(0, 0%, 100%)']) {
    state.config.color_bg_primary = color;
    await page.goto(baseURL);
    await expectLogo(page, saved.logo_url, 2);
  }
});

test('keeps failed changes pending and retries only images that were not saved', async t => {
  const { page, state } = await setup(t);
  await openSettings(page);
  await page.getByRole('checkbox', { name: 'Usar as logos da landing page no sistema' }).uncheck();
  await chooseImage(page);
  await chooseImage(page, 'system.png', 'system-light');
  state.failure = 'INVALID_LOGO_IMAGE';
  state.failureSlot = 'system-light';
  await saveButton(page).click();
  await page.getByRole('alert').filter({ hasText: 'alterações restantes continuam pendentes' }).waitFor();
  assert.equal(state.uploads.length, 2);
  assert.equal(state.config.system_logo_url, null);
  assert.equal(state.config.system_uses_landing_logo, true);
  assert.equal(await asset(page).locator('img[src^="blob:"]').count(), 0);
  assert.ok(await asset(page, 'system-light').locator('img[src^="blob:"]').count());
  const savedLanding = state.config.logo_url;
  state.failure = null;
  await saveAll(page);
  assert.equal(state.uploads.length, 3);
  assert.equal(state.config.logo_url, savedLanding);
  assert.equal(state.config.system_uses_landing_logo, false);
});

test('restoring the default is also a draft, can be discarded, and survives failed saves', async t => {
  const { page, state } = await setup(t);
  await openSettings(page);
  await asset(page).getByRole('button', { name: 'Restaurar logo padrão' }).click();
  assert.equal(state.resets, 0);
  await expectLogo(page, oldLogo, 1);
  assert.equal(await asset(page).locator('[data-image-preview] img').first().getAttribute('src'), '/logo-dark.png');
  await discardAll(page);
  assert.equal(await asset(page).locator('[data-image-preview] img').first().getAttribute('src'), oldLogo);
  await asset(page).getByRole('button', { name: 'Restaurar logo padrão' }).click();
  state.resetFailure = true;
  await saveButton(page).click();
  await page.getByRole('alert').waitFor();
  assert.equal(state.config.logo_url, oldLogo);
  assert.equal(await bar(page).getAttribute('data-pending-changes'), 'true');
  state.resetFailure = false;
  await saveAll(page);
  assert.equal(state.config.logo_url, null);
  await page.reload();
  await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('src') === '/logo.png', logoSelector);
  await page.goto(`${baseURL}/login`);
  await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('src') === '/logo-dark.png', logoSelector);
});

test('sharing changes keep unused variants and failed preferences can be retried or discarded', async t => {
  const { page, state } = await setup(t);
  state.config.system_logo_url = 'http://assets.logo.test/separate.png';
  await openSettings(page);
  const toggle = page.getByRole('checkbox', { name: 'Usar as logos da landing page no sistema' });
  await toggle.uncheck();
  assert.equal(state.preferenceUpdates.length, 0);
  state.preferenceFailure = true;
  await saveButton(page).click();
  await page.getByRole('alert').waitFor();
  assert.equal(state.config.system_uses_landing_logo, true);
  assert.equal(await toggle.isChecked(), false);
  await discardAll(page);
  assert.equal(await toggle.isChecked(), true);
  await toggle.uncheck();
  state.preferenceFailure = false;
  await saveAll(page);
  await expectLogo(page, state.config.system_logo_url, 1);
  await toggle.check();
  await saveAll(page);
  await expectLogo(page, oldLogo, 1);
  assert.equal(state.config.system_logo_url, 'http://assets.logo.test/separate.png');
});

test('a failed form save keeps unsaved fields and does not repeat successful image uploads', async t => {
  const { page, state } = await setup(t);
  await openSettings(page);
  await chooseImage(page);
  await page.locator('input:not([type])').first().fill('contato@novo.test');
  state.generalFailure = true;
  await saveButton(page).click();
  await page.getByRole('alert').waitFor();
  assert.equal(state.uploads.length, 1);
  assert.equal(await page.locator('input:not([type])').first().inputValue(), 'contato@novo.test');
  assert.equal(await bar(page).getAttribute('data-pending-changes'), 'true');
  state.generalFailure = false;
  await saveAll(page);
  assert.equal(state.uploads.length, 1);
  assert.equal(state.config.email, 'contato@novo.test');
});

test('a stale configuration response cannot overwrite the newly saved logo', async t => {
  const { page, state } = await setup(t);
  await openSettings(page);
  await expectLogo(page, oldLogo, 1);
  const gate = { started: deferred(), release: deferred(), finished: deferred() };
  state.configGate = gate;
  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'advocacia_office_config_updated', newValue: 'test' })));
  await gate.started.promise;
  await chooseImage(page);
  await saveAll(page);
  gate.release.resolve();
  await gate.finished.promise;
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expectLogo(page, state.config.logo_url, 1);
});

test('favicon upload and reset update public tabs only after saving the pending changes', async t => {
  const { page, context, state } = await setup(t);
  await openSettings(page);
  const landing = await context.newPage();
  await landing.goto(baseURL);
  await expectLogo(landing, oldLogo, 2);
  await chooseImage(page, 'favicon.png', 'favicon');
  assert.equal(state.config.favicon_url, null);
  assert.equal(await landing.locator('link[rel="icon"]').getAttribute('href'), '/favicon.svg');
  await saveAll(page);
  const icon = state.config.favicon_url;
  for (const tab of [page, landing]) await tab.waitForFunction(url => document.querySelector('link[rel="icon"]').href === url, icon);
  await page.reload();
  await page.waitForFunction(url => document.querySelector('link[rel="icon"]').href === url, icon);
  await asset(page, 'favicon').getByRole('button', { name: 'Restaurar ícone padrão' }).click();
  assert.equal(state.config.favicon_url, icon);
  await saveAll(page);
  for (const tab of [page, landing]) await tab.waitForFunction(() => document.querySelector('link[rel="icon"]').getAttribute('href') === '/favicon.svg');
  assert.equal(state.config.logo_url, oldLogo);
});

test('aligns every preview with its upload block, including after choosing a new image', async t => {
  const { page } = await setup(t);
  await openSettings(page);
  await page.getByRole('checkbox', { name: 'Usar as logos da landing page no sistema' }).uncheck();
  await page.getByRole('checkbox', { name: 'Usar a mesma logo nos fundos claro e escuro da landing page' }).uncheck();
  await page.getByRole('checkbox', { name: 'Usar a mesma logo nos fundos claro e escuro do sistema' }).uncheck();
  for (const slot of Object.keys(slots)) {
    await chooseImage(page, `${slot}.png`, slot);
    // Read both boxes in the same frame so smooth scrolling cannot skew their positions.
    const { upload, preview } = await asset(page, slot).evaluate(element => ({
      upload: element.querySelector('[data-image-upload]').getBoundingClientRect().toJSON(),
      preview: element.querySelector('[data-image-preview]').getBoundingClientRect().toJSON(),
    }));
    assert.ok(Math.abs(upload.y - preview.y) <= 1, `${slot}: tops align (${upload.y}, ${preview.y})`);
    assert.ok(Math.abs(upload.height - preview.height) <= 1, `${slot}: heights match`);
  }
  if (process.env.LOGO_SCREENSHOT_DIR) {
    await mkdir(process.env.LOGO_SCREENSHOT_DIR, { recursive: true });
    await asset(page).screenshot({ path: `${process.env.LOGO_SCREENSHOT_DIR}/logo-settings-aligned.png` });
  }
});

test('keeps logo previews and the pending bar usable on mobile', async t => {
  const { page } = await setup(t, { viewport: { width: 375, height: 812 } });
  await openSettings(page);
  await chooseImage(page);
  const layout = asset(page).locator(':scope > div');
  assert.equal(await layout.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), 1);
  const boxes = await asset(page).getByAltText('Prévia da nova imagem').evaluateAll(images => images.map(img => ({
    width: img.getBoundingClientRect().width, parentWidth: img.parentElement.getBoundingClientRect().width, fit: getComputedStyle(img).objectFit,
  })));
  for (const box of boxes) { assert.ok(box.width <= box.parentWidth); assert.equal(box.fit, 'contain'); }
  await saveAll(page);
  await page.goto(baseURL);
  await expectLogo(page, 'http://assets.logo.test/landing-light-1.png', 2);
  const navbarLogo = await page.locator(`nav ${logoSelector}`).boundingBox();
  assert.ok(navbarLogo.width <= 160 && navbarLogo.height <= 60);
});

test('preserves landing colors without applying them to the system or login', async t => {
  const { page, state } = await setup(t);
  state.config = { ...state.config, color: '#119933', color_bg_primary: '#14395A', color_buttons: '#8C2B40' };
  await openSettings(page);
  await chooseImage(page);
  await saveAll(page);
  assert.equal(await page.locator('[data-landing-theme]').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--navy')), '');
  await page.goto(baseURL);
  await page.waitForFunction(() => document.querySelector('[data-landing-theme]')?.style.getPropertyValue('--bg-primary') === '#14395A');
  await page.goto(`${baseURL}/login`);
  await expectLogo(page, state.config.logo_url, 1);
  assert.equal(await page.locator('[data-landing-theme]').count(), 0);
});

test('denies unauthenticated and non-admin access without redirect loops', async t => {
  for (const role of [null, 'USER']) {
    const { page, state } = await setup(t, { role });
    await page.goto(`${baseURL}/sistema/landing-page`);
    await page.waitForURL(`${baseURL}${role ? '/sistema/clientes' : '/login'}`);
    assert.equal(await page.getByRole('heading', { name: 'Logos e ícone do navegador' }).count(), 0);
    assert.equal(state.uploads.length, 0);
  }
});

test('unavailable logo and favicon assets fall back to the defaults', async t => {
  const { page, state } = await setup(t);
  state.config.favicon_url = 'http://assets.logo.test/missing.png';
  state.missingImage = true;
  for (const [path, fallback] of [['/', '/logo.png'], ['/login', '/logo-dark.png']]) {
    await page.goto(`${baseURL}${path}`);
    await page.waitForFunction(({ selector, fallback }) => {
      const logo = document.querySelector(selector);
      return logo?.getAttribute('src') === fallback && logo.complete && logo.naturalWidth > 0;
    }, { selector: logoSelector, fallback });
    await page.waitForFunction(() => document.querySelector('link[rel="icon"]').getAttribute('href') === '/favicon.svg');
  }
});


test('accepts SVG and saves a new default only through the shared bar', async t => {
  const { page, state } = await setup(t);
  await openSettings(page);
  const input = asset(page).locator('input[type="file"]');
  assert.match(await input.getAttribute('accept'), /image\/svg\+xml/);
  state.previewGate = deferred();
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 40"><rect width="80" height="40" fill="red"/></svg>');
  await input.setInputFiles({ name: 'marca.svg', mimeType: 'image/svg+xml', buffer: svg });
  await asset(page).getByRole('checkbox', { name: 'Usar esta imagem como padrão' }).check();
  assert.equal(await saveButton(page).isDisabled(), true);
  state.previewGate.resolve();
  state.previewGate = null;
  await page.waitForFunction(() => document.querySelector('[data-logo-slot="landing-light"] img[src^="blob:"]')?.complete);
  assert.equal(state.config.default_logo_url, null);
  assert.equal(state.uploads.length, 0);
  await saveAll(page);
  const savedDefault = state.config.logo_url;
  assert.equal(state.config.default_logo_url, savedDefault);
  assert.match(state.uploads[0].postDataBuffer().toString('latin1'), /filename="marca.svg"/);
  await page.reload();
  await asset(page).getByText('Esta é a imagem padrão.').waitFor();
  await chooseImage(page, 'outra.png');
  await saveAll(page);
  const replacement = state.config.logo_url;
  assert.notEqual(replacement, savedDefault);
  assert.equal(state.config.default_logo_url, savedDefault);
  await asset(page).getByRole('button', { name: 'Restaurar logo padrão', exact: true }).click();
  assert.equal(await asset(page).locator('[data-image-preview] img').first().getAttribute('src'), savedDefault);
  assert.equal(state.config.logo_url, replacement);
  await discardAll(page);
  assert.equal(state.config.logo_url, replacement);
  await asset(page).getByRole('button', { name: 'Restaurar logo padrão', exact: true }).click();
  await saveAll(page);
  assert.equal(state.config.logo_url, savedDefault);
  await asset(page).getByRole('button', { name: 'Restaurar padrão original', exact: true }).click();
  assert.equal(state.config.default_logo_url, savedDefault);
  await saveAll(page);
  assert.equal(state.config.logo_url, null);
  assert.equal(state.config.default_logo_url, null);
});

test('promotes the current image without re-upload and keeps a failed default change pending', async t => {
  const { page, state } = await setup(t);
  await openSettings(page);
  const toggle = asset(page).getByRole('checkbox', { name: 'Usar esta imagem como padrão' });
  await toggle.check();
  assert.equal(state.defaults.length, 0);
  await discardAll(page);
  assert.equal(await toggle.isChecked(), false);
  assert.equal(state.defaults.length, 0);
  await toggle.check();
  state.defaultFailure = true;
  await saveButton(page).click();
  await page.getByRole('alert').waitFor();
  assert.equal(state.config.default_logo_url, null);
  assert.equal(await toggle.isChecked(), true);
  state.defaultFailure = false;
  await saveAll(page);
  assert.equal(state.config.default_logo_url, oldLogo);
  assert.equal(state.uploads.length, 0);
});

test('each theme, system logo and favicon can have its own default', async t => {
  const { page, state } = await setup(t);
  await openSettings(page);
  await page.getByRole('checkbox', { name: 'Usar as logos da landing page no sistema' }).uncheck();
  await page.getByRole('checkbox', { name: 'Usar a mesma logo nos fundos claro e escuro da landing page' }).uncheck();
  await page.getByRole('checkbox', { name: 'Usar a mesma logo nos fundos claro e escuro do sistema' }).uncheck();
  for (const slot of Object.keys(slots)) {
    await chooseImage(page, `${slot}.png`, slot);
    await asset(page, slot).getByRole('checkbox', { name: 'Usar esta imagem como padrão' }).check();
  }
  assert.equal(state.uploads.length, 0);
  await saveAll(page);
  for (const field of Object.values(slots)) assert.equal(state.config[field], state.config[`default_${field}`]);
  const landingDefault = state.config.default_logo_url;
  await asset(page, 'favicon').getByRole('button', { name: 'Restaurar padrão original' }).click();
  await saveAll(page);
  assert.equal(state.config.favicon_url, null);
  assert.equal(state.config.default_favicon_url, null);
  assert.equal(state.config.default_logo_url, landingDefault);
});
