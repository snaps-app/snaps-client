import { afterAll, beforeAll, expect, it } from 'vitest';
import { chromium, type Browser } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';

let browser: Browser; let server: Server; let origin: string;
let markdown = '# Documento extenso\n\n<script>window.evil=1</script>\n\n' + Array.from({ length: 45 }, (_, i) => '## Seção ' + (i + 1) + '\n\n' + 'Conteúdo original com ação, acentos e detalhes de suporte. '.repeat(30) + '\n\n| Campo | Valor |\n| --- | --- |\n| Teste | Evidência |\n\n').join('');
function pngChunk(kind: string, data: Buffer) {
  const name = Buffer.from(kind); const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([name, data])) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, name, data, checksum]);
}
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(Buffer.from([0, 255, 255, 255, 255]))), pngChunk('IEND', Buffer.alloc(0))]);
const imageUrl = 'https://evidence.example.test/image.png';
const card = { id: 'card', title: 'Bug de teste', description: 'Descrição preservada', status: 'new-issues', card_type: 'bug', created_at: '2026-10-23', card_metadata: {} };
beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/image.png') { res.setHeader('Content-Type', 'image/png'); res.end(png); return; }
    if (req.url === '/snaps-client.umd.js') { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(readFileSync('dist/snaps-client.umd.js')); return; }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html lang="pt-BR"><head><style>body{background:#f1f5f9;margin:24px}button{font-size:40px;color:red}article{max-height:10px}snaps-governance-docs{display:block;width:100%}</style></head><body><script src="/snaps-client.umd.js"></script>' + ['roadmap-board','support-board','governance-docs','costs-board','bug-report-form','feature-request-form'].map(name => '<snaps-' + name + ' project-id="p" api-key="fixture-key" api-url="' + origin + '" session-user-ref="user-a"></snaps-' + name + '>').join('') + '</body></html>');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + (server.address() as { port: number }).port;
  markdown += '\n\n![Evidência](' + imageUrl + ')\n\n[Ajuda](https://example.test/support)\n';
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
});
afterAll(async () => { await browser?.close(); if (server) await new Promise<void>(resolve => server.close(() => resolve())); });
async function host() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => { window.print = () => { (window as unknown as { printCalled: boolean }).printCalled = true; }; });
  const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await context.route(imageUrl, route => route.fulfill({ contentType: 'image/png', body: png }));
  const requests: string[] = [];
  const sentMessages: Record<string, unknown>[] = [];
  await context.route('**/public/projects/**', async route => {
    const req = route.request(); const path = new URL(req.url()).pathname; requests.push(path);
    expect(req.headers()['x-api-key']).toBe('fixture-key');
    let json: unknown = {};
    if (path.endsWith('/roadmap')) json = { project_id: 'p', sprints: [{ id: 's', name: 'Sprint ativa', status: 'active', cards: [] }], backlog: [], total: 1, has_more: false, backlog_total: 0, backlog_has_more: false };
    else if (path.endsWith('/support')) json = { items: [card], total: 1, limit: 10, offset: 0, has_more: false };
    else if (path.endsWith('/support/cards/card')) json = req.method() === 'PATCH' ? { ...card, ...req.postDataJSON() } : card;
    else if (path.endsWith('/docs')) json = [{ id: 'doc', name: 'Documento extenso', type: 'prd', updated_at: '2026-10-23' }];
    else if (path.endsWith('/docs/doc')) json = { id: 'doc', name: 'Documento extenso', type: 'prd', updated_at: '2026-10-23', content: markdown };
    else if (path.endsWith('/costs/hours')) json = { people: [{ id: 'a', display_name: 'Ana' }], series: [{ date: '2026-10-23', person_id: 'a', hours: 2 }], total_hours: 2, items: [], total: 0, limit: 100, offset: 0, has_more: false };
    else if (path.endsWith('/costs/llm')) json = { currency: 'USD', usage_count: 1, known_cost_usd: '0', total_cost_usd: '0', estimated_cost_usd: null, unknown_count: 0, pending_count: 0, coverage: 'complete', cost_basis: 'metered', coverage_started_at: '2026-10-23', tokens: { input_noncache_tokens: 10, cache_write_5m_tokens: 0, cache_read_tokens: 0, output_tokens: 5 }, tokens_unknown_count: 0, groups: [] };
    else if (path.endsWith('/support/chats')) json = { chat_id: 'chat', session_token: 'fixture-session', expires_at: '2030-01-01' };
    else if (path.endsWith('/support/upload')) {
      if (requests.filter(p => p.endsWith('/support/upload')).length === 1) { await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }); return; }
      json = { attachment_id: 'image-1', url: imageUrl, mime_type: 'image/png', size_bytes: png.length };
    }
    else if (path.endsWith('/messages')) {
      sentMessages.push(req.postDataJSON());
      await route.fulfill({ contentType: 'text/event-stream', body: 'data: {"type":"token","content":"Resposta pública"}\n\ndata: {"type":"proposal","hash":"' + 'a'.repeat(64) + '","version":1,"proposal":{"title":"Proposta pública","description":"Revise antes de criar","card_type":"bug","attachment_ids":[]}}\n\ndata: {"type":"done","incompleto":false}\n\n' }); return;
    } else if (path.endsWith('/confirm')) json = { ...card, title: 'Proposta pública' };
    else if (path.endsWith('/close')) { await route.fulfill({ status: 204 }); return; }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(json) });
  });
  await page.goto(origin);
  return { page, context, errors, requests, sentMessages };
}
it('loads standalone UMD, versions six Shadow DOM hosts and confirms an ephemeral support proposal', async () => {
  const { page, context, errors, requests, sentMessages } = await host();
  try {
    await page.locator('snaps-costs-board').getByRole('tab', { name: 'IA de suporte' }).click();
    await page.locator('snaps-costs-board').getByText('USD 0.00000000', { exact: true }).first().waitFor();
    expect(await page.evaluate(() => { const api = (window as unknown as { SnapsClient: { version: string; registerAll: () => void } }).SnapsClient; api.registerAll(); api.registerAll(); return api.version; })).toBe('0.2.0');
    expect(await page.locator('[data-snaps-version="0.2.0"]').count()).toBe(6);
    expect(await page.evaluate(() => [...document.querySelectorAll('[data-snaps-version]')].every(h => Boolean(h.shadowRoot?.querySelector('style')?.textContent?.includes('--snaps-primary'))))).toBe(true);
    expect(await page.locator('snaps-costs-board').getByRole('button', { name: 'Aplicar período' }).evaluate(el => getComputedStyle(el).fontSize)).not.toBe('40px');
    const support = page.locator('snaps-support-board'); await support.getByRole('button', { name: 'Abrir suporte Snaps' }).click();
    await support.getByLabel('Anexar imagens', { exact: true }).setInputFiles({ name: 'evidence.png', mimeType: 'image/png', buffer: png });
    await support.getByRole('button', { name: 'Tentar upload novamente' }).click();
    await support.getByText('evidence.png Pronta', { exact: true }).waitFor();
    await support.getByLabel('Mensagem', { exact: true }).fill('Relato desta sessão'); await support.getByRole('button', { name: 'Enviar', exact: true }).click();
    await support.getByRole('button', { name: 'Confirmar criação' }).waitFor(); expect(requests.filter(r => r.endsWith('/confirm')).length).toBe(0);
    await support.getByRole('button', { name: 'Confirmar criação' }).click(); await support.getByText(/Chamado criado:/).waitFor();
    expect(requests.filter(r => r.endsWith('/confirm')).length).toBe(1);
    expect(sentMessages[0].attachment_ids).toEqual(['image-1']); expect(sentMessages[0].context).toEqual([]);
    await support.getByRole('button', { name: 'Encerrar conversa', exact: true }).click(); await support.getByRole('button', { name: 'Abrir suporte Snaps' }).click();
    expect(await support.getByText('Relato desta sessão', { exact: true }).count()).toBe(0);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0); expect(errors).toEqual([]);
  } finally { await context.close(); }
});
it('downloads exact Markdown and creates an isolated real multipage A4 PDF', async () => {
  const { page, context, errors } = await host();
  try {
    const docs = page.locator('snaps-governance-docs'); await docs.getByText('Documento extenso', { exact: true }).click();
    const article = docs.locator('article'); await article.getByText('Seção 45', { exact: true }).first().waitFor();
    expect(await article.evaluate(el => getComputedStyle(el).maxHeight)).toBe('none');
    await docs.getByRole('button', { name: 'Ampliar', exact: true }).click(); await docs.getByRole('dialog').waitFor();
    await page.keyboard.press('Shift+Tab'); expect(await docs.getByRole('link', { name: 'Ajuda' }).evaluate(el => el.getRootNode() instanceof ShadowRoot && (el.getRootNode() as ShadowRoot).activeElement === el)).toBe(true);
    await page.keyboard.press('Tab'); expect(await docs.getByRole('button', { name: 'Fechar foco' }).evaluate(el => (el.getRootNode() as ShadowRoot).activeElement === el)).toBe(true);
    await page.keyboard.press('Escape'); expect(await docs.getByRole('dialog').count()).toBe(0);
    const downloadPromise = page.waitForEvent('download'); await docs.getByRole('button', { name: 'Baixar MD' }).click(); const download = await downloadPromise;
    const stream = await download.createReadStream(); const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk)); expect(Buffer.concat(chunks).toString('utf8')).toBe(markdown);
    const popupPromise = page.waitForEvent('popup'); await docs.getByRole('button', { name: 'Imprimir / PDF' }).click(); const popup = await popupPromise;
    await popup.locator('article').waitFor(); expect(await popup.evaluate(() => window.opener)).toBeNull(); expect(await popup.locator('script').count()).toBe(0);
    await popup.waitForFunction(() => (window as unknown as { printCalled?: boolean }).printCalled === true, undefined, { timeout: 15000 });
    expect(await popup.locator('img').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await popup.evaluate(() => (window as unknown as { evil?: boolean }).evil)).toBeUndefined();
    const pdf = await popup.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-'); const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length; expect(pages).toBeGreaterThan(1);
    const mediaBox = /\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/.exec(pdf.toString('latin1'));
    expect(mediaBox).toBeTruthy(); expect(Math.abs(Number(mediaBox![1]) - 595.28)).toBeLessThan(1); expect(Math.abs(Number(mediaBox![2]) - 841.89)).toBeLessThan(1);
    console.log('Real browser PDF:', pages, 'A4 pages;', pdf.length, 'bytes; SHA256', createHash('sha256').update(pdf).digest('hex'));
    expect(errors).toEqual([]); await popup.close();
  } finally { await context.close(); }
});

