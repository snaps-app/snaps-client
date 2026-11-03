import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SupportChat } from '../src/components/SupportBoard/SupportChat';
import { FloatingSupport } from '../src/components/SupportBoard/FloatingSupport';
import { SnapsPublicClient } from '../src/api/snaps-client';
import type { SupportEvent } from '../src/api/support-chat';
import { RoadmapBoard } from '../src/components/RoadmapBoard';
import { CreateCardModal } from '../src/components/SupportBoard/CreateCardModal';

const props = { projectId: 'p', apiKey: 'key', onCreated: vi.fn() };
const image = (name = 'print.png') => new File(['png'], name, { type: 'image/png' });
const attachment = { attachment_id: 'image-1', url: 'https://example.test/image.png', mime_type: 'image/png', size_bytes: 3 };
const paste = (files: File[]) => fireEvent.paste(screen.getByLabelText('Mensagem'), { clipboardData: { items: files.map(file => ({ kind: 'file', getAsFile: () => file })) } });
const send = () => { fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Relato' } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar', exact: true })); };

describe('Sprint 24.5 reacceptance', () => {
  beforeEach(() => {
    vi.spyOn(SnapsPublicClient.prototype, 'createSupportSession').mockResolvedValue({ chat_id: 'chat', session_token: 'token', expires_at: '2030-01-01' });
    vi.spyOn(SnapsPublicClient.prototype, 'closeSupportSession').mockResolvedValue();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn().mockReturnValue('blob:preview'), revokeObjectURL: vi.fn() }));
  });

  it('pastes an image through the file upload path with preview, retry and removal', async () => {
    const upload = vi.spyOn(SnapsPublicClient.prototype, 'uploadAttachment').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(attachment);
    render(<SupportChat {...props} />); await screen.findByLabelText('Mensagem');
    const file = image(); expect(paste([file])).toBe(false);
    expect(await screen.findByAltText('Prévia de print.png')).toHaveAttribute('src', 'blob:preview');
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar upload novamente' }));
    await screen.findByText('print.png Pronta');
    expect(upload.mock.calls.map(c => c[0])).toEqual([file, file]);
    fireEvent.click(screen.getByRole('button', { name: 'Remover print.png' }));
    expect(screen.queryByAltText('Prévia de print.png')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it.each(['paste', 'picker'])('enforces MIME, size, empty file and shared quantity limits through %s', async method => {
    const upload = vi.spyOn(SnapsPublicClient.prototype, 'uploadAttachment').mockResolvedValue(attachment);
    render(<SupportChat {...props} />); await screen.findByLabelText('Mensagem');
    const add = (files: File[]) => method === 'paste' ? paste(files) : fireEvent.change(screen.getByLabelText('Anexar imagens'), { target: { files } });
    for (const invalid of [new File(['bad'], 'bad.gif', { type: 'image/gif' }), new File([], 'empty.png', { type: 'image/png' }), new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })]) {
      add([invalid]); expect(screen.getByRole('alert')).toHaveTextContent('até 4 imagens');
    }
    expect(upload).not.toHaveBeenCalled();
    add([image('one.png'), image('two.png'), image('three.png'), image('four.png')]);
    // Try the other entry point before any upload resolves or React rerenders.
    if (method === 'paste') fireEvent.change(screen.getByLabelText('Anexar imagens'), { target: { files: [image('five.png')] } });
    else paste([image('five.png')]);
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(4));
    expect(screen.queryByAltText('Prévia de five.png')).toBeNull();
  });

  it('leaves ordinary text paste and Shift+Enter/IME to the composer', async () => {
    const request = vi.spyOn(SnapsPublicClient.prototype, 'sendSupportMessage').mockResolvedValue();
    render(<SupportChat {...props} />); const input = await screen.findByLabelText('Mensagem');
    expect(fireEvent.paste(input, { clipboardData: { items: [{ kind: 'string' }] } })).toBe(true);
    fireEvent.change(input, { target: { value: 'Texto' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(request).not.toHaveBeenCalled();
  });

  it('shows safe event-driven stages and blocks duplicate button and Enter sends', async () => {
    let receive!: (e: SupportEvent) => void; let finish!: () => void;
    const request = vi.spyOn(SnapsPublicClient.prototype, 'sendSupportMessage').mockImplementation(async (_s, _p, cb) => { receive = cb; await new Promise<void>(r => { finish = r; }); });
    render(<SupportChat {...props} />); await screen.findByLabelText('Mensagem'); send();
    expect(screen.getByRole('status')).toHaveTextContent('Enviando…');
    expect(screen.getByLabelText('Mensagem')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar', exact: true }));
    fireEvent.keyDown(screen.getByLabelText('Mensagem'), { key: 'Enter' });
    expect(request).toHaveBeenCalledTimes(1);
    act(() => receive({ type: 'thinking' })); expect(screen.getByRole('status')).toHaveTextContent('Pensando…');
    act(() => receive({ type: 'tool_start' })); expect(screen.getByRole('status')).toHaveTextContent('Consultando…');
    act(() => receive({ type: 'tool_end' })); expect(screen.getByRole('status')).toHaveTextContent('Pensando…');
    act(() => receive({ type: 'token', content: 'Resposta' })); expect(screen.getByRole('status')).toHaveTextContent('Escrevendo…');
    await act(async () => { receive({ type: 'done', incompleto: false }); finish(); });
    expect(screen.getByLabelText('Mensagem')).toBeEnabled(); expect(screen.queryByRole('status')).toBeNull();
  });

  it.each(['Escape', 'X', 'launcher'])('confirms %s before aborting SSE and closing the session', async control => {
    let signal!: AbortSignal;
    vi.spyOn(SnapsPublicClient.prototype, 'sendSupportMessage').mockImplementation(async (_s, _p, _cb, s) => {
      signal = s!; await new Promise<void>((_, reject) => s!.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError'))));
    });
    const close = vi.mocked(SnapsPublicClient.prototype.closeSupportSession);
    render(<FloatingSupport {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir suporte Snaps' })); await screen.findByLabelText('Mensagem'); send();
    const attempt = () => control === 'Escape' ? fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }) : fireEvent.click(screen.getByRole('button', { name: control === 'X' ? 'Encerrar conversa' : 'Encerrar conversa de suporte', exact: true }));
    attempt(); expect(await screen.findByRole('alertdialog')).toHaveTextContent('cancelada');
    expect(signal.aborted).toBe(false); expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar conversa' })); expect(signal.aborted).toBe(false);
    attempt(); fireEvent.click(screen.getByRole('button', { name: 'Cancelar e fechar', exact: true }));
    await waitFor(() => expect(signal.aborted).toBe(true));
    expect(close).toHaveBeenCalledTimes(1); expect(close).toHaveBeenCalledWith(expect.objectContaining({ chat_id: 'chat' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('protects closing during an upload and cancels that upload only after confirmation', async () => {
    let signal!: AbortSignal;
    vi.spyOn(SnapsPublicClient.prototype, 'uploadAttachment').mockImplementation(async (_f, s) => { signal = s!; await new Promise<void>((_, reject) => s!.addEventListener('abort', () => reject(new Error('cancelled')))); return attachment; });
    render(<FloatingSupport {...props} />); fireEvent.click(screen.getByRole('button', { name: 'Abrir suporte Snaps' })); await screen.findByLabelText('Mensagem');
    paste([image()]); expect(screen.getByRole('button', { name: 'Enviar', exact: true })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar conversa', exact: true })); expect(signal.aborted).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar e fechar', exact: true })); expect(signal.aborted).toBe(true);
  });

  it('resends a terminal incomplete response in the same UI row without uploading or duplicating its attachment', async () => {
    const upload = vi.spyOn(SnapsPublicClient.prototype, 'uploadAttachment').mockResolvedValue(attachment);
    const request = vi.spyOn(SnapsPublicClient.prototype, 'sendSupportMessage').mockImplementationOnce(async (_s, _p, cb) => { cb({ type: 'token', content: 'Parcial' }); cb({ type: 'done', incompleto: true }); }).mockImplementation(async (_s, _p, cb) => { cb({ type: 'token', content: 'Resposta completa' }); cb({ type: 'done', incompleto: false }); });
    render(<SupportChat {...props} />); await screen.findByLabelText('Mensagem'); paste([image()]); await screen.findByText('print.png Pronta'); send();
    await screen.findByText('Resposta incompleta'); expect(screen.getByText('Parcial')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar envio novamente' })); await screen.findByText('Resposta completa');
    expect(upload).toHaveBeenCalledTimes(1); expect(screen.getAllByAltText('Imagem enviada nesta conversa')).toHaveLength(1);
    expect(screen.getAllByText('Relato', { exact: true })).toHaveLength(1); expect(screen.queryByText('Parcial')).toBeNull();
    const first = request.mock.calls[0][1], second = request.mock.calls[1][1];
    expect(second).toEqual({ ...first, client_message_id: expect.any(String) });
    expect(second.client_message_id).not.toBe(first.client_message_id); expect(second.attachment_ids).toEqual(['image-1']);
    expect(screen.queryByText('Resposta incompleta')).toBeNull();
  });

  it('keeps a transport retry idempotent until the server acknowledges an incomplete receipt', async () => {
    const request = vi.spyOn(SnapsPublicClient.prototype, 'sendSupportMessage').mockRejectedValueOnce(new Error('network')).mockImplementation(async (_s, _p, cb) => cb({ type: 'done', incompleto: false }));
    render(<SupportChat {...props} />); await screen.findByLabelText('Mensagem'); send();
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar envio novamente' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][1]).toEqual(request.mock.calls[0][1]);
  });

  it('uses the SupportBoard spinner for pagination and filter changes', async () => {
    let resolve!: (v: object) => void;
    const page = { project_id: 'p', sprints: [{ id: 's', name: 'Sprint', status: 'active', cards: [] }], backlog: [], total: 2, has_more: true };
    const fetch = vi.spyOn(SnapsPublicClient.prototype, 'fetchRoadmapSprints').mockResolvedValueOnce(page).mockImplementation(() => new Promise(r => { resolve = r; }) as never);
    render(<RoadmapBoard projectId="p" apiKey="key" showBacklog={false} />); await screen.findByText('Sprint');
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais sprints' }));
    expect(screen.getByRole('status').querySelector('svg')).toHaveClass('w-8', 'h-8', 'animate-spin');
    await act(async () => resolve({ ...page, has_more: false }));
    screen.getByText('Filtrar sprints').closest('details')!.open = true;
    fireEvent.click(screen.getByRole('checkbox', { name: 'Concluídas' }));
    expect(screen.getByRole('status').querySelector('svg')).toHaveClass('animate-spin');
    expect(fetch).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0, sprintStatus: ['done'] }), expect.any(AbortSignal));
    await act(async () => resolve({ ...page, sprints: [], has_more: false }));
    expect(screen.getByText('Nenhuma sprint neste filtro.')).toBeInTheDocument();
  });

  it.each(['bug', 'feature'] as const)('keeps the structured %s creation form', tab => {
    render(<CreateCardModal projectId="p" apiKey="key" isOpen defaultTab={tab} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByText(tab === 'bug' ? /O que aconteceu/ : /Dor.*oportunidade/i)).toBeInTheDocument();
  });
});
