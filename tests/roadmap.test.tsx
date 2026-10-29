import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoadmapBoard } from '../src/components/RoadmapBoard';
import { SnapsPublicClient } from '../src/api/snaps-client';

const page = (name: string, more = false) => ({ project_id: 'p', sprints: [{ id: name, name, status: 'active', cards: [] }], backlog: [], total: 12, has_more: more, backlog_total: 0, backlog_has_more: false });
it('requests independent pagination and repeated status parameters', async () => {
  const f = vi.fn().mockResolvedValue(new Response(JSON.stringify(page('one')))); vi.stubGlobal('fetch', f);
  await new SnapsPublicClient({ projectId: 'p', apiKey: 'key' }).fetchRoadmapSprints({ limit: 10, offset: 10, sprintStatus: ['active', 'done'], backlogLimit: 20, backlogOffset: 20 });
  const u = new URL(f.mock.calls[0][0]);
  expect(u.searchParams.getAll('sprint_status')).toEqual(['active', 'done']);
  expect(u.searchParams.get('backlog_offset')).toBe('20');
});
it('ignores an old project response and retains filters in an empty result', async () => {
  let old!: (v: ReturnType<typeof page>) => void;
  const f = vi.spyOn(SnapsPublicClient.prototype, 'fetchRoadmapSprints').mockImplementationOnce(() => new Promise(r => { old = r; })).mockResolvedValue({ ...page('current'), sprints: [] });
  const view = render(<RoadmapBoard projectId="old" apiKey="key" showBacklog={false} />);
  view.rerender(<RoadmapBoard projectId="new" apiKey="key" showBacklog={false} />);
  await screen.findByText('Nenhuma sprint neste filtro.');
  old(page('stale')); await waitFor(() => expect(screen.queryByText('stale')).toBeNull());
  expect(screen.queryByRole('button', { name: 'Concluídas' })).toBeNull();
  expect(screen.getByText('Filtrar sprints').closest('details')!.open).toBe(false);
  fireEvent.click(screen.getByText('Filtrar sprints')); screen.getByText('Filtrar sprints').closest('details')!.open = true;
  fireEvent.click(screen.getByRole('checkbox', { name: 'Concluídas' }));
  await waitFor(() => expect(f).toHaveBeenLastCalledWith(expect.objectContaining({ sprintStatus: ['done'], offset: 0 }), expect.any(AbortSignal)));
});
it('loads more without duplicate sprint IDs and retries a failed page', async () => {
  const f = vi.spyOn(SnapsPublicClient.prototype, 'fetchRoadmapSprints').mockResolvedValueOnce(page('one', true)).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page('one'));
  render(<RoadmapBoard projectId="p" apiKey="key" showBacklog={false} />);
  await screen.findByText('one'); fireEvent.click(screen.getByRole('button', { name: 'Carregar mais sprints' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente sprints' }));
  await waitFor(() => expect(f).toHaveBeenCalledTimes(3));
  expect(screen.getAllByText('one')).toHaveLength(1);
});
