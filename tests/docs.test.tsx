import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocViewer } from '../src/components/GovernanceDocs/DocViewer';
import { markdownFilename, printHtml } from '../src/components/GovernanceDocs/export';
const doc = { id: 'd', name: '../Documento: ação', type: 'prd', updated_at: '2026-10-23', content: '# Olá\n\n<script>window.evil=1</script>\n\nTexto original com acentos\n' };
it('opens focus mode, traps keyboard focus and restores it on Escape in Shadow DOM', () => {
  const host = document.createElement('div'); document.body.append(host); const shadow = host.attachShadow({ mode: 'open' }); const target = document.createElement('div'); shadow.append(target);
  const view = render(<DocViewer doc={doc} onBack={vi.fn()} />, { container: target, baseElement: target });
  const expand = view.getByRole('button', { name: 'Ampliar' }); expand.focus(); fireEvent.click(expand);
  const dialog = view.getByRole('dialog'); expect(shadow.activeElement && dialog.contains(shadow.activeElement)).toBe(true);
  const close = view.getByRole('button', { name: 'Fechar foco' });
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true }); expect(shadow.activeElement).toBe(view.getByRole('button', { name: 'Imprimir / PDF' }));
  fireEvent.keyDown(shadow.activeElement!, { key: 'Tab' }); expect(shadow.activeElement).toBe(close);
  fireEvent.keyDown(dialog, { key: 'Escape' }); expect(view.queryByRole('dialog')).toBeNull(); expect(shadow.activeElement).toBe(expand); host.remove();
});
it('downloads original markdown with a sanitized name and revokes its URL', () => {
  const create = vi.fn().mockReturnValue('blob:test'); const revoke = vi.fn(); vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<DocViewer doc={doc} onBack={vi.fn()} />); fireEvent.click(screen.getByRole('button', { name: 'Baixar MD' }));
  expect(create.mock.calls[0][0].size).toBe(new TextEncoder().encode(doc.content).length); expect(revoke).toHaveBeenCalledWith('blob:test');
  expect(markdownFilename(doc.name)).not.toMatch(/[/:\\]/);
});
it('prints only sanitized markdown in an isolated A4 document', async () => {
  const popup = new DOMParser().parseFromString(printHtml(doc), 'text/html');
  expect(popup.querySelector('script')).toBeNull(); expect(popup.body.textContent).toContain('Texto original');
  expect(popup.querySelector('style')?.textContent).toContain('size: A4');
});
