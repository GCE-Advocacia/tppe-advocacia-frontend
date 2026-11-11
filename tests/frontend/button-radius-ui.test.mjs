import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const playwrightModule = process.env.PLAYWRIGHT_MODULE_PATH;
const { chromium } = await import(playwrightModule ? pathToFileURL(playwrightModule).href : 'playwright');
let browser;
let server;
let baseURL;

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    server: { host: '127.0.0.1', port: 0, open: false },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://api.radius.test/api/v1') },
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

async function setup(t, { radius = '6px', width = 1440 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  context.setDefaultTimeout(10_000);
  context.setDefaultNavigationTimeout(30_000);
  t.after(() => context.close());
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  t.after(() => assert.deepEqual(errors, [], 'No browser errors'));
  const token = `test.${Buffer.from(JSON.stringify({ sub: '1', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
  await context.addInitScript(({ token, origin }) => {
    if (location.origin === origin) localStorage.setItem('advocacia_access_token', token);
  }, { token, origin: baseURL });
  const state = {
    config: { id: 1, office_name: 'Teste Advocacia', button_radius: radius, color: '#232C43',
      logo_same_for_themes: true, system_logo_same_for_themes: true, system_uses_landing_logo: true,
      differentials: [], areas_of_practice: [] },
    updates: [], themeWrites: [], failure: false,
  };
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === baseURL) return route.continue();
    if (url.hostname !== 'api.radius.test') return route.abort();
    const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json',
      body: JSON.stringify(status < 400 ? { success: true, data, meta: { total: 0, page: 1, limit: 20, pages: 0 } } : data) });
    if (url.pathname === '/api/v1/office-config') {
      if (request.method() === 'PATCH') {
        state.updates.push(request.postDataJSON());
        if (state.failure) return respond({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao salvar formulário.' } }, 500);
        state.config = { ...state.config, ...request.postDataJSON() };
      }
      return respond(state.config);
    }
    if (url.pathname.includes('themes') && request.method() !== 'GET') state.themeWrites.push(request);
    return respond([]);
  });
  const page = await context.newPage();
  return { page, context, state };
}

const settings = page => page.locator('[data-button-radius-settings]');
const save = page => page.getByRole('button', { name: 'Salvar alterações', exact: true });
const slider = page => page.getByRole('slider', { name: 'Raio dos cantos' });
const radiusOf = locator => locator.evaluate(element => getComputedStyle(element).borderTopLeftRadius);

async function openSettings(page) {
  await page.goto(`${baseURL}/sistema/personalizacao`);
  await settings(page).waitFor();
}

async function expectGlobal(page, value) {
  await page.waitForFunction(value => getComputedStyle(document.documentElement).getPropertyValue('--btn-radius').trim() === value, value);
}

async function expectPreview(page, value) {
  assert.equal(await radiusOf(page.locator('[data-button-radius-preview]')), value);
  const radii = await page.locator('[data-landing-preview] [class*="pvButton"], [data-landing-preview] [class*="pvOutline"]').evaluateAll(elements => elements.map(element => getComputedStyle(element).borderTopLeftRadius));
  assert.equal(radii.length, 5);
  assert.ok(radii.every(radius => radius === value), JSON.stringify(radii));
}

async function saveAll(page) {
  await save(page).click();
  await page.locator('[data-pending-changes="false"]').waitFor({ state: 'attached' });
}

test('all presets update every preview immediately, without publishing drafts; discard restores saved radius', async t => {
  const { page, state } = await setup(t);
  await openSettings(page);
  assert.equal(await settings(page).getByRole('button', { name: 'Suave (6px)' }).getAttribute('aria-pressed'), 'true');
  for (const [label, value] of [['Reto', '0px'], ['Moderno', '12px'], ['Pílula', '999px'], ['Suave', '6px']]) {
    await settings(page).getByRole('button', { name: `${label} (${value})`, exact: true }).click();
    await expectPreview(page, value);
    await expectGlobal(page, '6px');
    assert.equal(await radiusOf(save(page)), '6px');
  }
  await settings(page).getByRole('button', { name: 'Pílula (999px)' }).click();
  await page.getByRole('button', { name: 'Descartar', exact: true }).click();
  await expectPreview(page, '6px');
  assert.equal(state.updates.length, 0);
});

test('custom slider covers 0–24px and stays open when crossing preset values', async t => {
  const { page } = await setup(t);
  await openSettings(page);
  await settings(page).getByRole('button', { name: 'Customizado' }).click();
  assert.equal(await slider(page).getAttribute('min'), '0');
  assert.equal(await slider(page).getAttribute('max'), '24');
  await slider(page).press('Home');
  for (let value = 0; value <= 24; value++) {
    if (value) await slider(page).press('ArrowRight');
    assert.equal(await settings(page).locator('output').textContent(), `${value}px`);
    await expectPreview(page, `${value}px`);
  }
  await settings(page).getByRole('button', { name: 'Pílula (999px)' }).click();
  assert.equal(await slider(page).count(), 0);
  await settings(page).getByRole('button', { name: 'Customizado' }).click();
  assert.equal(await slider(page).inputValue(), '24');
  await page.getByRole('button', { name: 'Descartar', exact: true }).click();
  assert.equal(await slider(page).count(), 0);
});

test('shared save persists radius, updates existing public tabs, system actions and direct login visits', async t => {
  const { page, context, state } = await setup(t);
  await openSettings(page);
  const landing = await context.newPage();
  await landing.goto(baseURL);
  await expectGlobal(landing, '6px');
  await settings(page).getByRole('button', { name: 'Pílula (999px)' }).click();
  await expectGlobal(landing, '6px');
  await saveAll(page);
  await expectGlobal(page, '999px');
  await expectGlobal(landing, '999px');
  assert.equal(state.updates.length, 1);
  assert.equal(state.updates[0].button_radius, '999px');
  assert.equal(state.config.color, '#232C43');
  assert.equal(state.themeWrites.length, 0);
  assert.equal(await radiusOf(landing.getByRole('link', { name: 'Agendar Consulta', exact: true }).first()), '999px');
  assert.equal(await radiusOf(landing.getByRole('button', { name: 'Enviar Mensagem', exact: true })), '999px');
  await page.reload();
  await settings(page).waitFor();
  assert.equal(await settings(page).getByRole('button', { name: 'Pílula (999px)' }).getAttribute('aria-pressed'), 'true');
  await page.goto(`${baseURL}/sistema/usuarios`);
  assert.equal(await radiusOf(page.getByRole('button', { name: /Novo Usuário/i })), '999px');
  const login = await context.newPage();
  await login.goto(`${baseURL}/login`);
  await expectGlobal(login, '999px');
  assert.equal(await radiusOf(login.locator('button[type="submit"]').first()), '999px');
});

test('a failed save preserves the draft and original global radius; retry saves custom values across reload', async t => {
  const { page, state } = await setup(t, { radius: '17px' });
  await openSettings(page);
  assert.equal(await slider(page).inputValue(), '17');
  await slider(page).press('ArrowRight');
  state.failure = true;
  await save(page).click();
  await page.getByText('Erro ao salvar formulário.', { exact: true }).waitFor();
  await expectGlobal(page, '17px');
  await expectPreview(page, '18px');
  assert.equal(state.config.button_radius, '17px');
  state.failure = false;
  await saveAll(page);
  await expectGlobal(page, '18px');
  await page.reload();
  assert.equal(await slider(page).inputValue(), '18');
});

test('legacy config defaults to Suave and zero survives save/reload', async t => {
  const { page, state } = await setup(t);
  delete state.config.button_radius;
  await openSettings(page);
  await expectPreview(page, '6px');
  await settings(page).getByRole('button', { name: 'Reto (0px)' }).click();
  await saveAll(page);
  assert.equal(state.config.button_radius, '0px');
  await page.reload();
  await settings(page).waitFor();
  await expectPreview(page, '0px');
  await expectGlobal(page, '0px');
});

for (const width of [1440, 390]) {
  test(`selector and custom controls fit the viewport at ${width}px`, async t => {
    const { page } = await setup(t, { width });
    await openSettings(page);
    await settings(page).getByRole('button', { name: 'Customizado' }).click();
    await slider(page).press('End');
    for (const locator of [settings(page), slider(page), page.locator('[data-button-radius-preview]')]) {
      const box = await locator.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width, JSON.stringify(box));
    }
    if (process.env.RADIUS_SCREENSHOT_DIR) {
      await mkdir(process.env.RADIUS_SCREENSHOT_DIR, { recursive: true });
      await settings(page).screenshot({ path: `${process.env.RADIUS_SCREENSHOT_DIR}/radius-${width}.png` });
    }
  });
}
