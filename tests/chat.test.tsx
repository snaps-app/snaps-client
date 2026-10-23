import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SupportChat } from '../src/components/SupportBoard/SupportChat';
import { SnapsPublicClient } from '../src/api/snaps-client';
import { readSupportEvents, recentContext } from '../src/api/support-chat';
import { SnapsHttpError } from '../src/api/snaps-client';

it('parses fragmented UTF-8 SSE and exposes only public fields', async () => {
  const raw = new TextEncoder().encode('data: {"type":"thinking","content":"secret"}\r\n\r\ndata: {"type":"token","content":"Olá","private":"secret"}\r\n\r\ndata: {"type":"done","incompleto":false}\n\n');
  const events: unknown[] = [];
  await readSupportEvents(new ReadableStream({ start(c) { for (const b of raw) c.enqueue(new Uint8Array([b])); c.close(); } }), e => events.push(e));
  expect(events).toEqual([{ type: 'token', content: 'Olá' }, { type: 'done', incompleto: false }]);
});
it('bounds only current user/assistant text to 12 messages and 16000 chars', () => {
  const context = recentContext(Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(5000) })) as never);
  expect(context.length).toBeLessThanOrEqual(12); expect(context.reduce((n, x) => n + x.content.length, 0)).toBeLessThanOrEqual(16000); expect(context.every(x => x.content.length <= 4000)).toBe(true);
});
it('creates a fresh empty session on identity change and closes the previous session', async () => {
  const create = vi.spyOn(SnapsPublicClient.prototype, 'createSupportSession').mockResolvedValueOnce({ chat_id: 'A', session_token: 'token-A', expires_at: '2030-01-01' }).mockResolvedValue({ chat_id: 'B', session_token: 'token-B', expires_at: '2030-01-01' });
  const close = vi.spyOn(SnapsPublicClient.prototype, 'closeSupportSession').mockResolvedValue();
  vi.spyOn(SnapsPublicClient.prototype, 'sendSupportMessage').mockImplementation(async (_s, _payload, cb) => { cb({ type: 'token', content: 'Resposta A' }); cb({ type: 'done', incompleto: false }); });
  const v = render(<SupportChat projectId="p" apiKey="key" sessionUserRef="A" onCreated={vi.fn()} />);
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  await waitFor(() => expect((screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Pergunta A' } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  await screen.findByText('Resposta A');
  v.rerender(<SupportChat projectId="p" apiKey="key" sessionUserRef="B" onCreated={vi.fn()} />);
  await waitFor(() => expect(create).toHaveBeenCalledTimes(2)); expect(screen.queryByText('Pergunta A')).toBeNull(); expect(close).toHaveBeenCalledWith(expect.objectContaining({ chat_id: 'A' }));
  expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
});
it('requires proposal confirmation and refreshes the created card once', async () => {
  vi.spyOn(SnapsPublicClient.prototype, 'createSupportSession').mockResolvedValue({ chat_id: 'A', session_token: 't', expires_at: '2030-01-01' });
  vi.spyOn(SnapsPublicClient.prototype, 'closeSupportSession').mockResolvedValue();
  const proposal = { type: 'proposal' as const, hash: 'a'.repeat(64), version: 2, proposal: { title: 'Bug proposto', description: 'Texto', card_type: 'bug' as const, attachment_ids: [] } };
  vi.spyOn(SnapsPublicClient.prototype, 'sendSupportMessage').mockImplementation(async (_s, _p, cb) => { cb(proposal); cb({ type: 'done', incompleto: false }); });
  const confirm = vi.spyOn(SnapsPublicClient.prototype, 'confirmSupportProposal').mockResolvedValue({ id: 'card', title: 'Bug proposto', status: 'new-issues', created_at: '' }); const created = vi.fn();
  render(<SupportChat projectId="p" apiKey="key" onCreated={created} />);
  await waitFor(() => expect((screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Relato' } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  const button = await screen.findByRole('button', { name: 'Confirmar criação' }); expect(confirm).not.toHaveBeenCalled(); fireEvent.click(button);
  await waitFor(() => expect(created).toHaveBeenCalledTimes(1)); expect(confirm).toHaveBeenCalledWith(expect.anything(), { hash: proposal.hash, version: 2 });
});

it('cancels the upstream request and preserves only this session partial', async () => {
  vi.spyOn(SnapsPublicClient.prototype, 'createSupportSession').mockResolvedValue({ chat_id: 'A', session_token: 't', expires_at: '2030-01-01' });
  const close = vi.spyOn(SnapsPublicClient.prototype, 'closeSupportSession').mockResolvedValue();
  let signal: AbortSignal | undefined;
  const send = vi.spyOn(SnapsPublicClient.prototype, 'sendSupportMessage').mockImplementation(async (_s, _p, cb, s) => { signal = s; cb({ type: 'token', content: 'Parcial desta sessão' }); await new Promise((_resolve, reject) => s?.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')))); });
  const v = render(<SupportChat projectId="p" apiKey="key" onCreated={vi.fn()} />);
  await screen.findByLabelText('Mensagem'); fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Relato' } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  await screen.findByText('Parcial desta sessão'); fireEvent.click(screen.getByRole('button', { name: 'Cancelar resposta' }));
  await screen.findByText('Resposta incompleta'); expect(signal?.aborted).toBe(true); expect(send).toHaveBeenCalledTimes(1);
  v.unmount(); expect(close).toHaveBeenCalled();
});
it('expires the session and clears text on 410', async () => {
  vi.spyOn(SnapsPublicClient.prototype, 'createSupportSession').mockResolvedValue({ chat_id: 'A', session_token: 't', expires_at: '2030-01-01' });
  vi.spyOn(SnapsPublicClient.prototype, 'closeSupportSession').mockResolvedValue();
  vi.spyOn(SnapsPublicClient.prototype, 'sendSupportMessage').mockRejectedValue(new SnapsHttpError(410));
  render(<SupportChat projectId="p" apiKey="key" onCreated={vi.fn()} />); await screen.findByLabelText('Mensagem');
  fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Dado temporário' } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  await screen.findByText(/Conversa expirada/); expect(screen.queryByText('Dado temporário')).toBeNull(); expect(screen.queryByLabelText('Mensagem')).toBeNull();
});
