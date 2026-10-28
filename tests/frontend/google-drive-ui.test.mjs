import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
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
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://api.drive.test/api/v1') },
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

const PROCESS = {
  id: 1, number: '00012345620248260100', client_id: 1, client_name: 'Cliente Teste', court: 'TJSP',
  tribunal_alias: 'tjsp', action_type: 'Cível', status: 'ATIVO', created_at: '2026-10-01T10:00:00Z',
  opposing_party: null, created_by: 1, updated_by: 1, updated_at: '2026-10-01T10:00:00Z',
};

async function setup(t, { role = 'ADMIN', drive = { connected: false, email: null }, query = '' } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  context.setDefaultTimeout(10_000);
  context.setDefaultNavigationTimeout(30_000);
  t.after(() => context.close());
  const token = `test.${Buffer.from(JSON.stringify({ sub: '1', role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
  await context.addInitScript(({ token, origin }) => {
    if (location.origin === origin) localStorage.setItem('advocacia_access_token', token);
  }, { token, origin: baseURL });

  const state = { drive, disconnects: 0, googleVisits: [], uploads: 0 };
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === baseURL) return route.continue();
    if (url.hostname === 'google.test') {
      state.googleVisits.push(url.href);
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google</p>' });
    }
    if (url.hostname !== 'api.drive.test') return route.abort();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const ok = data => json({ success: true, data, meta: { total: Array.isArray(data) ? data.length : 0, page: 1, limit: 20, pages: 1 } });
    const path = url.pathname.replace('/api/v1', '');

    if (path === '/integrations/google-drive/status') return ok(state.drive);
    if (path === '/integrations/google-drive/auth-url') return ok({ auth_url: 'http://google.test/auth?state=x' });
    if (path === '/integrations/google-drive' && request.method() === 'DELETE') {
      state.disconnects += 1;
      state.drive = { connected: false, email: null };
      return route.fulfill({ status: 204, body: '' });
    }
    if (path === '/processes') return ok([PROCESS]);
    if (path === '/processes/1') return ok(PROCESS);
    if (path === '/processes/1/documents' && request.method() === 'POST') {
      state.uploads += 1;
      return json({ success: false, error: { code: 'GOOGLE_DRIVE_NOT_CONNECTED', message: 'Google Drive is not connected' } }, 409);
    }
    return ok([]);
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/sistema/processos${query}`);
  return { page, state };
}

const driveBlock = page => page.locator('[data-google-drive]');

test('admin sees connect button when disconnected and is sent to auth url', async t => {
  const { page, state } = await setup(t);
  await driveBlock(page).getByRole('button', { name: 'Conectar Google Drive' }).click();
  await page.waitForURL('http://google.test/**');
  assert.deepEqual(state.googleVisits, ['http://google.test/auth?state=x']);
});

test('admin sees email and disconnect when connected', async t => {
  const { page, state } = await setup(t, { drive: { connected: true, email: 'escritorio@example.test' } });
  await driveBlock(page).getByText('Google Drive conectado: escritorio@example.test').waitFor();
  await driveBlock(page).getByRole('button', { name: 'Desconectar' }).click();
  await driveBlock(page).getByRole('button', { name: 'Conectar Google Drive' }).waitFor();
  assert.equal(state.disconnects, 1);
});

test('non-admin does not see the drive block', async t => {
  const { page } = await setup(t, { role: 'USER' });
  await page.getByRole('heading', { name: 'Core Jurídico' }).waitFor();
  await page.waitForTimeout(300);
  assert.equal(await driveBlock(page).count(), 0);
});

test('connected query param shows success message and is removed from URL', async t => {
  const { page } = await setup(t, { query: '?google_drive=connected', drive: { connected: true, email: 'a@b.test' } });
  await page.getByText('Google Drive conectado com sucesso!').waitFor();
  await page.waitForFunction(() => !location.search.includes('google_drive'));
});

test('error query param shows failure message', async t => {
  const { page } = await setup(t, { query: '?google_drive=error' });
  await page.getByText('Não foi possível conectar o Google Drive.').waitFor();
});

for (const [role, message] of [
  ['ADMIN', 'Conecte o Google Drive para anexar documentos.'],
  ['USER', 'O Google Drive não está conectado. Peça a um administrador para conectar.'],
]) {
  test(`upload with GOOGLE_DRIVE_NOT_CONNECTED shows ${role} message`, async t => {
    const { page, state } = await setup(t, { role });
    await page.getByRole('button', { name: 'Abrir Ficha' }).click();
    // Como o usuário: rola até a seção de documentos e anexa por lá.
    const attach = page.getByRole('button', { name: 'Anexar documento' });
    await attach.scrollIntoViewIfNeeded();
    const documents = page.locator('section', { has: page.getByRole('heading', { name: 'Documentos' }) });
    await documents.locator('input[type="file"]').setInputFiles({ name: 'peticao.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
    const notice = documents.getByText(message);
    await notice.waitFor();
    assert.equal(state.uploads, 1);
    const inViewport = await notice.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    assert.ok(inViewport, 'a mensagem de erro precisa estar visível na tela');
  });
}
