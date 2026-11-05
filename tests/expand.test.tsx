import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FloatingSupport } from '../src/components/SupportBoard/FloatingSupport';
import { SnapsPublicClient } from '../src/api/snaps-client';
import type { SupportEvent } from '../src/api/support-chat';

const props = { projectId: 'p', apiKey: 'key', onCreated: vi.fn() };
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
function setup() {
  const create = vi.spyOn(SnapsPublicClient.prototype, 'createSupportSession').mockResolvedValue({ chat_id: 'chat', session_token: 'token', expires_at: '2030-01-01' });
  vi.spyOn(SnapsPublicClient.prototype, 'closeSupportSession').mockResolvedValue();
  return create;
}
it('retains the active session, stream and focus while changing size; Escape requests close', async () => {
  const create = setup(); let receive!: (event: SupportEvent) => void; let finish!: () => void; let signal!: AbortSignal;
  const send = vi.spyOn(SnapsPublicClient.prototype, 'sendSupportMessage').mockImplementation(async (_session, _payload, cb, s) => { receive = cb; signal = s!; await new Promise<void>(r => { finish = r; }); });
  render(<FloatingSupport {...props} />); fireEvent.click(screen.getByLabelText('Abrir suporte Snaps'));
  const input = await screen.findByLabelText('Mensagem'); fireEvent.change(input, { target: { value: 'Relato' } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar', exact: true }));
  const toggle = screen.getByRole('button', { name: 'Ampliar' }); toggle.focus(); fireEvent.click(toggle);
  expect(toggle).toHaveFocus(); expect(toggle).toHaveAttribute('aria-pressed', 'true'); expect(toggle).toHaveAccessibleName('Restaurar');
  expect(create).toHaveBeenCalledTimes(1); expect(send.mock.calls[0][0].chat_id).toBe('chat'); expect(signal.aborted).toBe(false);
  act(() => receive({ type: 'token', content: 'Ainda conectado' })); expect(screen.getByText('Ainda conectado')).toBeInTheDocument();
  fireEvent.keyDown(toggle, { key: 'Escape' }); expect(screen.getByRole('alertdialog')).toBeInTheDocument(); expect(toggle).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByText('Continuar conversa')); expect(signal.aborted).toBe(false);
  await act(async () => { receive({ type: 'done', incompleto: false }); finish(); });
  expect(create).toHaveBeenCalledTimes(1);
});
it('persists the preference on reopening and defaults to compact if storage is unavailable', async () => {
  setup(); const view = render(<FloatingSupport {...props} />); fireEvent.click(screen.getByLabelText('Abrir suporte Snaps')); await screen.findByLabelText('Mensagem');
  fireEvent.click(screen.getByLabelText('Ampliar')); expect(localStorage.getItem('snaps-support-expanded')).toBe('true');
  fireEvent.click(screen.getByLabelText('Encerrar conversa')); fireEvent.click(screen.getByLabelText('Abrir suporte Snaps')); expect(screen.getByLabelText('Restaurar')).toHaveAttribute('aria-pressed', 'true');
  view.unmount(); vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); }); vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  render(<FloatingSupport {...props} />); fireEvent.click(screen.getByLabelText('Abrir suporte Snaps')); await screen.findByLabelText('Mensagem');
  fireEvent.click(screen.getByLabelText('Ampliar')); expect(screen.getByLabelText('Restaurar')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Encerrar conversa')); fireEvent.click(screen.getByLabelText('Abrir suporte Snaps')); await waitFor(() => expect(screen.getByLabelText('Ampliar')).toHaveAttribute('aria-pressed', 'false'));
});
