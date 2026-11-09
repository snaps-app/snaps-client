import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { BugReportForm } from '../src/components/BugReportForm';
import { FeatureRequestForm } from '../src/components/FeatureRequestForm';
import { SupportChat } from '../src/components/SupportBoard/SupportChat';
import { SnapsPublicClient } from '../src/api/snaps-client';

const repository = () => screen.getByRole('combobox', { name: 'Repositório' });
const configure = { projectId: 'p', apiKey: 'key', repositories: ' App, , Site, app ' };
const ticket = { title: 'Proposta', description: 'Dados coletados', card_type: 'bug', attachment_ids: ['image'] };
const proposal = (version: number, name?: string) => ({
  type: 'proposal', version, hash: version.toString(16).repeat(64),
  proposal: { ...ticket, ...(name ? { repo_name: name } : {}) },
});
const json = (value: unknown, status = 200) => Response.json(value, { status });

it.each([
  { Form: BugReportForm, action: 'Reportar Bug', repo: 'Site' },
  { Form: FeatureRequestForm, action: 'Enviar Sugestão', repo: 'App' },
])('submits the selected repository and keeps a draft after a proxy 422 ($action)', async ({ Form, action, repo }) => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response('proxy error', { status: 422 }))
    .mockResolvedValueOnce(json({ id: 'card', repo_name: repo }, 201));
  vi.stubGlobal('fetch', fetch);
  const success = vi.fn();
  const { container } = render(<Form {...configure} defaultRepository="outside" onSuccess={success} />);
  expect(repository()).toHaveValue('');
  expect(within(repository()).getAllByRole('option')).toHaveLength(3);
  expect(screen.getByRole('button', { name: action })).toBeDisabled();
  fireEvent.change(repository(), { target: { value: repo } });
  const fields = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('form input[type=text], form textarea');
  fields.forEach(field => fireEvent.change(field, { target: { value: 'Dados' } }));
  fireEvent.click(screen.getByRole('button', { name: action }));
  await screen.findByText(/não está disponível para o projeto da sua chave/i);
  expect(fields[0]).toHaveValue('Dados');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ repo_name: repo });
  fireEvent.click(screen.getByRole('button', { name: action }));
  await waitFor(() => expect(success).toHaveBeenCalledOnce());
});

it('fixes a single option and uses a valid default with more than one option', () => {
  const view = render(<BugReportForm {...configure} repositories="App, app" defaultRepository="outside" />);
  expect(repository()).toHaveValue('App');
  expect(repository()).toBeDisabled();
  view.rerender(<BugReportForm {...configure} defaultRepository="site" />);
  expect(repository()).toHaveValue('Site');
  expect(repository()).toBeEnabled();
});

function chatFetch(handle: (body: Record<string, unknown>, method: string) => Response | Promise<Response>) {
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    const body = JSON.parse(String(init.body));
    if (path.endsWith('/chats')) return json({ chat_id: 'chat', session_token: 'fixture', expires_at: '2099-01-01' }, 201);
    if (path.endsWith('/close')) return new Response(null, { status: 204 });
    if (path.endsWith('/messages')) {
      return new Response('data: ' + JSON.stringify(proposal(1, 'Untrusted')) + '\n\ndata: {"type":"done"}\n\n',
        { headers: { 'Content-Type': 'text/event-stream' } });
    }
    return handle(body, path.split('/').at(-1)!);
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

async function sendTicket() {
  fireEvent.change(await screen.findByLabelText('Mensagem'), { target: { value: 'Tente usar outro repo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  return screen.findByRole('button', { name: 'Confirmar criação' });
}

it('waits for the latest repository review, recovers a generic 409 and confirms the displayed pair', async () => {
  const calls: unknown[] = [];
  let replyOld!: (response: Response) => void;
  const fetch = chatFetch((body, method) => {
    calls.push({ method, ...body });
    if (method === 'confirm') return json({ id: 'card', title: ticket.title, repo_name: 'Site' });
    if (body.repo_name === 'App') return new Promise(resolve => { replyOld = resolve; });
    if (body.recover) return json(proposal(2, 'App'));
    if (body.version === 1) return new Response('generic proxy response', { status: 409 });
    return json(proposal(3, 'Site'));
  });
  const created = vi.fn();
  render(<SupportChat {...configure} defaultRepository="app" onCreated={created} />);
  const confirm = await sendTicket();
  await waitFor(() => expect(calls).toContainEqual({ method: 'repository', repo_name: 'App', version: 1, hash: '1'.repeat(64) }));
  expect(confirm).toBeDisabled();
  expect(screen.queryByText('Untrusted')).toBeNull();
  fireEvent.change(repository(), { target: { value: 'Site' } });
  await waitFor(() => expect(confirm).toBeEnabled());
  const shown = screen.getByRole('region', { name: 'Proposta de chamado' });
  expect(within(shown).getByText('Site', { selector: 'strong' })).toBeInTheDocument();
  await act(async () => { replyOld(json(proposal(2, 'App'))); });
  expect(confirm).toBeEnabled();
  fireEvent.click(confirm);
  await waitFor(() => expect(created).toHaveBeenCalledOnce());
  expect(calls).toContainEqual({ method: 'repository', recover: true });
  expect(calls.at(-1)).toEqual({ method: 'confirm', version: 3, hash: '3'.repeat(64) });
  const sent = fetch.mock.calls.find(([url]) => url.endsWith('/messages'))!;
  expect(JSON.parse(String(sent[1].body))).not.toHaveProperty('repo_name');
});

it('requires a local selection and keeps the conversation after proxy 422', async () => {
  chatFetch((body, method) => {
    if (method === 'confirm') return new Response('{}', { status: 422 });
    if (body.repo_name === 'App') return new Response('no details', { status: 422 });
    return json(proposal(2, 'Site'));
  });
  render(<SupportChat {...configure} onCreated={vi.fn()} />);
  const confirm = await sendTicket();
  expect(confirm).toBeDisabled();
  fireEvent.change(repository(), { target: { value: 'App' } });
  await screen.findByText(/não está disponível para o projeto da sua chave/i);
  expect(confirm).toBeDisabled();
  expect(screen.getByText('Tente usar outro repo')).toBeInTheDocument();
  fireEvent.change(repository(), { target: { value: 'Site' } });
  await waitFor(() => expect(confirm).toBeEnabled());
  fireEvent.click(confirm);
  await screen.findByText(/não está disponível para o projeto da sua chave/i);
  expect(confirm).toBeDisabled();
});

it('keeps the legacy request body and skips repository revision with no list', async () => {
  const fetch = vi.fn().mockResolvedValue(json({ id: 'card' }, 201));
  vi.stubGlobal('fetch', fetch);
  const api = new SnapsPublicClient({ projectId: 'p', apiKey: 'key' });
  await api.createSupportCard({ title: 'Legacy' });
  expect(fetch.mock.calls[0][1].body).toBe('{"title":"Legacy"}');
  const view = render(<BugReportForm projectId="p" apiKey="key" defaultRepository="App" />);
  expect(screen.queryByRole('combobox', { name: 'Repositório' })).toBeNull();
  view.unmount();
  const revise = chatFetch((body, method) => {
    if (method !== 'confirm') throw new Error('Unexpected revision');
    expect(body).toEqual({ hash: '1'.repeat(64), version: 1 });
    return json({ id: 'card', title: 'Legacy' });
  });
  render(<SupportChat projectId="p" apiKey="key" onCreated={vi.fn()} />);
  const confirm = await sendTicket();
  fireEvent.click(confirm);
  await screen.findByText(/Chamado criado:/);
  expect(revise.mock.calls.some(([url]) => url.endsWith('/proposal/repository'))).toBe(false);
});
