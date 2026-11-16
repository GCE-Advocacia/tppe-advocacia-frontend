import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import { officialThemes } from './fixtures/official-themes.mjs';

const modulePath = process.env.PLAYWRIGHT_MODULE_PATH;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
let browser, server, baseURL;
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL('../../', import.meta.url)),
    server: { host: '127.0.0.1', port: 0, open: false }, logLevel: 'error',
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://api.audit.test/api/v1') } });
  await server.listen();
  baseURL = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await server?.close(); });

async function setup(t, { customCount = 0, active = 1 } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  context.setDefaultTimeout(10_000);
  context.setDefaultNavigationTimeout(30_000);
  t.after(() => context.close());
  const errors = [];
  context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  t.after(() => assert.deepEqual(errors, [], 'No unhandled browser errors'));
  const token = `test.${Buffer.from(JSON.stringify({ sub: '1', role: 'ADMIN', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.test`;
  await context.addInitScript(({ token, origin }) => {
    if (location.origin === origin) localStorage.setItem('advocacia_access_token', token);
  }, { token, origin: baseURL });
  const themes = structuredClone(officialThemes);
  for (let i=0; i<customCount; i++) themes.push({ ...themes[0], id: i+4, name: `Customizado ${i+1}`, is_predefined: false });
  const state = { themes, writes: [], failure: false, nextId: customCount+4,
    config: { ...themes.find(t => t.id === active), id: 1, theme_id: active, office_name: 'Escritório Auditoria', button_radius: '6px',
      logo_same_for_themes: true, system_uses_landing_logo: true, system_logo_same_for_themes: true, differentials: [], areas_of_practice: [] } };
  delete state.config.name; delete state.config.description; delete state.config.is_predefined;
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace('/api/v1','');
    if (url.origin === baseURL) return route.continue();
    if (url.hostname !== 'api.audit.test') return route.abort();
    const method = request.method();
    const payload = request.postData() ? request.postDataJSON() : {};
    const respond = (data, status=200, total=0) => route.fulfill({ status, contentType:'application/json', body: JSON.stringify(status>=400 ? data : { success: true, data, meta:{ total, page:1, limit:10, pages:Math.max(1,Math.ceil(total/10)) } }) });
    if (method !== 'GET') state.writes.push({ path, method, payload });
    if (path === '/office-config/themes/quota') {
      const count = state.themes.filter(t => !t.is_predefined).length;
      return respond({ max_custom:6, max_total:9, custom_count:count, total_count:state.themes.length, is_limit_reached:count>=6 });
    }
    if (path === '/office-config/themes') {
      if (method === 'GET') return respond(state.themes);
      if (state.themes.filter(t=>!t.is_predefined).length>=6) return respond({error:{code:'THEME_LIMIT_EXCEEDED',message:'Limite de temas atingido'}},400);
      const theme = { ...payload, id:state.nextId++, is_predefined:false };
      state.themes.push(theme); return respond(theme,201);
    }
    const themeMatch = path.match(/^\/office-config\/themes\/(\d+)$/);
    if (themeMatch) {
      const theme = state.themes.find(t => t.id === Number(themeMatch[1]));
      if (method === 'DELETE') {
        state.themes = state.themes.filter(t=>t.id!==theme.id);
        if (state.config.theme_id===theme.id) state.config.theme_id=null;
        return route.fulfill({status:204});
      }
      Object.assign(theme,payload); return respond(theme);
    }
    if (path === '/office-config') {
      if (method === 'PATCH') {
        if(state.failure) return respond({error:{code:'INTERNAL_ERROR',message:'Falha simulada ao salvar'}},500);
        Object.assign(state.config,payload);
      }
      return respond(state.config);
    }
    const process = {id:1,number:'0000001-01.2026.8.07.0001',client_id:null,client_name:null,court:'TJDFT',tribunal_alias:'tjdft',action_type:'Auditoria',status:'ATIVO',created_at:'2026-11-01T12:00:00Z',updated_at:'2026-11-01T12:00:00Z',opposing_party:null};
    if(path==='/processes') return respond([process],200,20);
    if(path==='/processes/1') return respond(process);
    if(path==='/tasks' && url.searchParams.has('process_id')) return respond([{id:1,title:'Tarefa Auditoria',status:'PENDENTE',assigned_to_name:null,due_date:null,process_id:1}],200,1);
    if (path === '/finance/summary') return respond({total_income:'100',total_expense:'20',balance:'80'});
    if (path === '/notifications/preferences') return respond({preferences:{}});
    return respond([]);
  });
  const page = await context.newPage();
  return { page, context, state };
}
const save = page => page.locator('[data-pending-changes]').getByRole('button',{name:'Salvar alterações',exact:true});
const themeCard = (page,name) => page.getByTitle('Clique para selecionar este tema', {exact:true}).filter({has:page.getByRole('heading',{name,exact:true})});
const colorPopover = page => page.locator('[data-slot="color-picker-content"]');
const token = (page,key) => page.evaluate(key=>getComputedStyle(document.documentElement).getPropertyValue(key).trim(),key);
async function openSettings(page) {
  await page.goto(`${baseURL}/sistema/personalizacao`);
  await page.getByRole('button',{name:'Biblioteca de Temas',exact:true}).waitFor();
}
async function changeBackground(page,color) {
  await page.locator('[data-slot="color-picker-root"] button').first().click();
  await colorPopover(page).locator('input[type="text"]').fill(color);
  await page.keyboard.press('Escape');
}
async function saved(page) { await page.locator('[data-pending-changes="false"]').waitFor({state:'attached'}); }

test('TC-S1-06: gallery creates, duplicates, edits and confirms deletion without changing the active palette',async t=>{
  const {page,state}=await setup(t);
  await openSettings(page);
  await page.getByRole('button',{name:'Biblioteca de Temas',exact:true}).click();
  for(const theme of officialThemes) await page.getByRole('heading',{name:theme.name,exact:true}).waitFor();
  await page.getByText('0/6 temas personalizáveis',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Criar Novo Tema',exact:true}).click();
  await page.getByPlaceholder('Ex: Cópia de Clássico Navy').fill('Tema Auditoria');
  await page.getByPlaceholder('Descreva a proposta deste tema...').fill('Descrição inicial');
  await page.getByRole('button',{name:'Salvar Tema',exact:true}).click();
  await page.getByRole('heading',{name:'Tema Auditoria',exact:true}).waitFor();
  const created=state.themes.find(t=>t.name==='Tema Auditoria');
  assert.equal(created.color_bg_primary,officialThemes[0].color_bg_primary);
  await themeCard(page,'Tema Auditoria').getByTitle(/Duplicar tema/).click();
  assert.match(await page.getByPlaceholder('Ex: Cópia de Clássico Navy').inputValue(),/\(Cópia\)$/);
  await page.getByRole('button',{name:'Duplicar Tema',exact:true}).click();
  await themeCard(page,'Tema Auditoria (Cópia)').waitFor();
  await themeCard(page,'Tema Auditoria (Cópia)').getByTitle('Editar informações e paleta deste tema').click();
  await page.getByPlaceholder('Ex: Cópia de Clássico Navy').fill('Tema Revisado');
  await page.getByPlaceholder('Descreva a proposta deste tema...').fill('Descrição revisada');
  await page.getByRole('button',{name:'Salvar Alterações',exact:true}).click();
  await themeCard(page,'Tema Revisado').waitFor();
  assert.equal(state.themes.find(t=>t.name==='Tema Revisado').description,'Descrição revisada');
  await themeCard(page,'Tema Revisado').getByTitle('Excluir tema personalizado').click();
  assert.ok(state.themes.some(t=>t.name==='Tema Revisado'));
  await page.getByRole('button',{name:'Confirmar Exclusão',exact:true}).click();
  await themeCard(page,'Tema Revisado').waitFor({state:'detached'});
  assert.equal(state.config.theme_id,1);
  assert.equal(state.writes.filter(w=>w.path==='/office-config').length,0);
});

test('TC-S1-07: full quota disables gallery creation/duplication and blocks predefined fork in save modal',async t=>{
  const {page,state}=await setup(t,{customCount:6});
  await openSettings(page);
  await page.getByRole('button',{name:'Biblioteca de Temas',exact:true}).click();
  await page.getByText('6/6 temas personalizáveis',{exact:true}).waitFor();
  await page.getByRole('status').filter({hasText:'Limite de 6 temas personalizados atingido'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Criar Novo Tema',exact:true}).isDisabled(),true);
  for(const button of await page.getByTitle(/Duplicar tema/).all()) assert.equal(await button.isDisabled(),true);
  await page.getByTitle('Fechar biblioteca de temas').click();
  await changeBackground(page,'#345678');
  await save(page).click();
  const dialog=page.getByRole('dialog',{name:'Novo Tema Personalizado'});
  await dialog.waitFor();
  await dialog.getByText(/Limite máximo de 6 temas personalizados atingido/).waitFor();
  assert.equal(await dialog.getByRole('button',{name:'Salvar alterações',exact:true}).isDisabled(),true);
  assert.equal(state.writes.length,0);
});

test('TC-S1-08: official color changes require a named fork before persisting config',async t=>{
  const {page,state}=await setup(t);
  await openSettings(page);
  await changeBackground(page,'#345678');
  await save(page).click();
  const dialog=page.getByRole('dialog',{name:'Novo Tema Personalizado'});
  await dialog.waitFor();
  assert.equal(state.writes.length,0);
  await dialog.getByPlaceholder('Ex: Corporativo Noturno, Minimalista Ouro...').fill('');
  assert.equal(await dialog.getByRole('button',{name:'Salvar alterações',exact:true}).isDisabled(),true);
  await dialog.getByPlaceholder('Ex: Corporativo Noturno, Minimalista Ouro...').fill('Fork da Auditoria');
  await dialog.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  await saved(page);
  assert.deepEqual(state.writes.map(w=>[w.method,w.path]),[['POST','/office-config/themes'],['PATCH','/office-config']]);
  assert.equal(state.config.color_bg_primary.toLowerCase(),'#345678');
  assert.equal(state.config.theme_id,4);
  assert.equal(state.themes[0].color_bg_primary,officialThemes[0].color_bg_primary);
});

for(const copy of [false,true]) test(`TC-S1-08: custom theme save ${copy?'creates a separate copy':'updates the existing theme'}`,async t=>{
  const {page,state}=await setup(t,{customCount:1,active:4});
  await openSettings(page);
  await changeBackground(page,'#345678');
  await save(page).click();
  const dialog=page.getByRole('dialog',{name:'Salvar alterações no tema'});
  await dialog.waitFor();
  assert.equal(state.writes.length,0);
  if(copy){
    await dialog.getByRole('button',{name:'Salvar como uma cópia separada',exact:true}).click();
    const copyDialog=page.getByRole('dialog',{name:'Salvar Tema na Biblioteca'});
    await copyDialog.getByPlaceholder('Ex: Corporativo Noturno, Minimalista Ouro...').fill('Cópia Auditoria');
    await copyDialog.getByRole('button',{name:'Salvar na Biblioteca',exact:true}).click();
  } else await dialog.getByRole('button',{name:'Atualizar tema',exact:true}).click();
  await saved(page);
  assert.equal(state.writes[0].method,copy?'POST':'PUT');
  assert.equal(state.writes[0].path,copy?'/office-config/themes':'/office-config/themes/4');
  assert.equal(state.config.theme_id,copy?5:4);
  assert.equal(state.themes.find(t=>t.id===4).color_bg_primary.toLowerCase(),copy?'#232c43':'#345678');
});

test('TC-S1-09: discard colors preserves radius and text drafts through tab changes and save',async t=>{
  const {page,state}=await setup(t);
  await openSettings(page);
  await changeBackground(page,'#345678');
  await page.getByRole('button',{name:'Moderno (12px)',exact:true}).click();
  await page.getByRole('tab',{name:/Conteúdo da Landing Page/}).click();
  await page.locator('[class*="field_"]').filter({has:page.locator('label').filter({hasText:/^TELEFONE$/})}).locator('input').fill('(61) 3333-4444');
  await page.getByRole('tab',{name:/Identidade Visual/}).click();
  await page.getByRole('button',{name:'Descartar Alterações de Cores',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Moderno (12px)',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await save(page).isEnabled(),true);
  await save(page).click(); await saved(page);
  assert.equal(state.config.phone,'(61) 3333-4444');
  assert.equal(state.config.button_radius,'12px');
  assert.equal(state.config.color_bg_primary,officialThemes[0].color_bg_primary);
  assert.equal(state.config.theme_id,1);
  assert.equal(state.writes.filter(w=>w.path.includes('/themes')).length,0);
});

test('TC-S1-10: color picker HEX/RGB/HSL/HSB and alpha update only the landing draft',async t=>{
  const {page,state}=await setup(t);
  await openSettings(page);
  const original=await token(page,'--brand-primary');
  await page.locator('[data-slot="color-picker-root"] button').first().click();
  const pop=colorPopover(page);
  await pop.locator('input[type="text"]').fill('#336699');
  for(const format of ['rgb','hsl','hsb','hex']){
    await pop.locator('select').selectOption(format);
    assert.equal(await pop.locator('select').inputValue(),format);
    if(format==='rgb') {
      assert.deepEqual(await pop.locator('input[type="number"]').evaluateAll(ns=>ns.slice(0,3).map(n=>Number(n.value))),[51,102,153]);
    }
    if(format!=='hex') {
      await pop.locator('input[type="number"]').first().press('ArrowUp');
      await pop.locator('input[type="number"]').first().press('ArrowDown');
      assert.match(await page.locator('[data-landing-preview]').evaluate(el=>el.style.getPropertyValue('--pv-bg-primary')), /^#[0-9a-f]{6}$/i);
    }
  }
  await pop.locator('input[type="text"]').fill('#336699');
  await pop.locator('input[type="number"]').fill('50');
  const preview=page.locator('[data-landing-preview]');
  assert.equal((await preview.evaluate(el=>el.style.getPropertyValue('--pv-bg-primary'))).toLowerCase(),'#33669980');
  assert.equal(await token(page,'--brand-primary'),original);
  assert.equal(state.writes.length,0);
  await page.keyboard.press('Escape');
  await page.locator('[data-slot="color-picker-root"] button').first().click();
  assert.equal(await colorPopover(page).locator('input[type="text"]').inputValue(),'#33669980');
  assert.equal(await colorPopover(page).locator('input[type="number"]').inputValue(),'50');
  await page.keyboard.press('Escape');
});

test('TC-S1-12: storage event updates another tab immediately and light surfaces get dark text',async t=>{
  const {page,context,state}=await setup(t);
  await page.goto(`${baseURL}/login`);
  await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--brand-primary')==='#232C43');
  const other=await context.newPage();
  const loaded=other.waitForResponse(r=>r.url().endsWith('/office-config'));
  await other.goto(`${baseURL}/sistema/processos`);
  await (await loaded).finished();
  await other.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await other.waitForFunction(()=>document.documentElement.style.getPropertyValue('--brand-primary')==='#232C43');
  const tokens={'--brand-primary':'#F5F3EF','--brand-primary-text':'#1A1A2E','--brand-accent':'#123456','--brand-title':'#654321','--brand-link':'#345678'};
  await page.evaluate(tokens=>localStorage.setItem('advocacia_theme_cache',JSON.stringify(tokens)),tokens);
  await other.waitForFunction(()=>document.documentElement.style.getPropertyValue('--brand-primary')==='#F5F3EF');
  for(const [key,value] of Object.entries(tokens)) assert.equal(await token(other,key),value);
  state.config.color=state.config.color_bg_primary='#F5F3EF';
  await page.reload();
  await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--brand-primary')==='#F5F3EF');
  assert.equal(await token(page,'--brand-primary-text'),'#1A1A2E');
});

for(const route of ['financeiro','artigos','feriados','usuarios']) test(`TC-S1-11: ${route} active pagination stays neutral under a colored brand`,async t=>{
  const {page,state}=await setup(t);
  state.config.color=state.config.color_bg_primary='#345678';
  await page.goto(`${baseURL}/sistema/${route}`);
  await page.locator('button[class*="pageActive"]').first().waitFor();
  const colors=await page.locator('button[class*="pageActive"]').evaluateAll(elements=>elements.map(el=>getComputedStyle(el).backgroundColor));
  assert.ok(colors.length>0);
  assert.ok(colors.every(color=>color==='rgb(35, 44, 67)'),JSON.stringify(colors));
});

test('TC-S1-11: process page indicator stays neutral under a colored brand',async t=>{
  const {page,state}=await setup(t);
  state.config.color=state.config.color_bg_primary='#345678';
  await page.goto(`${baseURL}/sistema/processos`);
  const indicator=page.locator('[class*="currentPage"]');
  await indicator.waitFor();
  assert.match(await indicator.innerText(),/Página 1 de 2/);
  assert.equal(await indicator.evaluate(el=>getComputedStyle(el).color),'rgb(107, 114, 128)');
  assert.equal(await indicator.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
});

test('TC-S1-11: process action headers use branding while the detail header stays neutral',async t=>{
  const {page,state}=await setup(t);
  state.config.color=state.config.color_bg_primary='#345678';
  await page.goto(`${baseURL}/sistema/processos`);
  await page.getByRole('button',{name:/Novo Processo/i}).click();
  const assertHeader=async name=>{
    const title=page.getByRole('heading',{name,exact:true}); await title.waitFor();
    assert.equal(await title.evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
    assert.equal(await title.evaluate(el=>getComputedStyle(el.parentElement).backgroundColor),'rgb(52, 86, 120)');
  };
  await assertHeader('Novo Registro de Processo');
  await page.getByRole('button',{name:'Fechar',exact:true}).click();
  await page.getByRole('button',{name:'Abrir Ficha',exact:true}).first().click();
  const detail=page.locator('[class*="detailModalHeader"]'); await detail.waitFor();
  assert.equal(await detail.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  assert.equal(await detail.evaluate(el=>getComputedStyle(el.parentElement).backgroundColor),'rgb(255, 255, 255)');
  await page.getByRole('button',{name:'Adicionar prazo',exact:true}).click();
  await assertHeader('Adicionar prazo');
  await page.getByRole('button',{name:'Fechar',exact:true}).last().click();
  await page.getByRole('button',{name:'Excluir tarefa',exact:true}).click();
  await assertHeader('Excluir tarefa');
});

test('TC-S1-11: active sidebar border and focused login field use their saved semantic colors',async t=>{
  const {page,state}=await setup(t);
  state.config.color_link_primary='#f0c040';
  state.config.color_buttons_system='#7c3aed';
  await page.goto(`${baseURL}/sistema/clientes`);
  const active=page.locator('aside a[class*="active"]'); await active.waitFor();
  await page.waitForFunction(()=>{
    const el=document.querySelector('aside a[class*="active"]');
    return el && getComputedStyle(el).borderLeftColor==='rgb(240, 192, 64)';
  });
  await page.goto(`${baseURL}/login`);
  await page.locator('input[type="email"]').focus();
  await page.waitForFunction(()=>{
    const el=document.querySelector('[class*="fieldInner"]:focus-within');
    return el && getComputedStyle(el).borderColor==='rgb(124, 58, 237)';
  });
});
