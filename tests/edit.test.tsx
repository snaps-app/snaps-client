import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CardDetailModal } from '../src/components/SupportBoard/CardDetailModal';
import { SnapsPublicClient, SnapsHttpError } from '../src/api/snaps-client';

const card = { id: 'c', title: 'Original', description: '## Legado\nTexto e ![print](https://example.test/print.png)', status: 'new-issues', card_type: 'bug', created_at: '2026-10-23', card_metadata: { severity: 'high', attachment_urls: ['https://example.test/print.png'] } };
it.each(['bug', 'feature'])('preserves legacy description, metadata and existing attachments for %s', async type => {
  const save = vi.spyOn(SnapsPublicClient.prototype, 'updateSupportCard').mockResolvedValue(card);
  const upload = vi.spyOn(SnapsPublicClient.prototype, 'uploadAttachment');
  const refresh = vi.fn();
  render(<CardDetailModal card={{ ...card, card_type: type }} projectId="p" apiKey="key" onClose={vi.fn()} onRefresh={refresh} />);
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Corrigido' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('c', { title: 'Corrigido', description: card.description, card_metadata: {} }));
  expect(upload).not.toHaveBeenCalled(); expect(refresh).toHaveBeenCalled();
});
it('keeps the draft on a concurrent 409 and removes internal actions', async () => {
  vi.spyOn(SnapsPublicClient.prototype, 'updateSupportCard').mockRejectedValue(new SnapsHttpError(409));
  render(<CardDetailModal card={card} projectId="p" apiKey="key" onClose={vi.fn()} onRefresh={vi.fn()} />);
  expect(screen.queryByText('Alterar Status')).toBeNull(); expect(screen.queryByTitle('Excluir chamado')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Rascunho' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await screen.findByRole('alert'); expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Rascunho');
});
it('hides Editar after triage', () => {
  render(<CardDetailModal card={{ ...card, status: 'triaging' }} projectId="p" apiKey="key" onClose={vi.fn()} onRefresh={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
});
