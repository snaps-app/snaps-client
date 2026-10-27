import React, { useState, useEffect, useMemo } from 'react';
import { SnapsPublicClient, SnapsSprint, SnapsCard, SprintStatus } from '../../api/snaps-client';
import { SprintSection } from './SprintSection';
import { Filter, ChevronDown } from 'lucide-react';

export interface RoadmapBoardProps { projectId: string; apiKey: string; apiUrl?: string; showBacklog?: boolean; }
type Page<T> = { items: T[]; offset: number; total: number; more: boolean; loading: boolean; error: boolean };
const initial = <T,>(): Page<T> => ({ items: [], offset: 0, total: 0, more: false, loading: true, error: false });
const statuses: [SprintStatus, string][] = [['active', 'Ativas'], ['planning', 'Planejadas'], ['done', 'Concluídas'], ['cancelled', 'Canceladas']];
function append<T extends { id: string }>(old: T[], next: T[]) { return [...new Map([...old, ...next].map(x => [x.id, x])).values()]; }

export function RoadmapBoard(props: RoadmapBoardProps) {
  return <RoadmapPages key={JSON.stringify([props.projectId, props.apiKey, props.apiUrl])} {...props} />;
}
function RoadmapPages({ projectId, apiKey, apiUrl, showBacklog = true }: RoadmapBoardProps) {
  const client = useMemo(() => new SnapsPublicClient({ projectId, apiKey, apiUrl }), [projectId, apiKey, apiUrl]);
  const [selected, setSelected] = useState<SprintStatus[]>([]);
  return <div className="space-y-4 w-full">
    <details className="snaps-roadmap-filter" onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); } }}>
      <summary><Filter size={16} aria-hidden="true" /> Filtrar sprints {selected.length > 0 && <span className="snaps-filter-count">{selected.length}</span>}<ChevronDown size={14} aria-hidden="true" /></summary>
      <fieldset><legend>Status das sprints</legend>
        {statuses.map(([status, label]) => <label key={status}><input type="checkbox" checked={selected.includes(status)} onChange={() => setSelected(s => s.includes(status) ? s.filter(x => x !== status) : [...s, status])} />{label}</label>)}
        <button type="button" className="snaps-button" disabled={!selected.length} onClick={() => setSelected([])}>Limpar filtros</button>
      </fieldset>
    </details>
    <SprintPages key={selected.join(',')} client={client} selected={selected} />
    {showBacklog && <BacklogPages client={client} />}
  </div>;
}
function usePages<T extends { id: string }>(client: SnapsPublicClient, selected: SprintStatus[], kind: 'sprints' | 'backlog') {
  const [page, setPage] = useState<Page<T>>(initial);
  const [request, setRequest] = useState({ offset: 0, retry: 0 });
  const filter = selected.join(',');
  useEffect(() => {
    const abort = new AbortController(); let current = true;
    setPage(p => ({ ...p, loading: true, error: false }));
    const offset = request.offset;
    client.fetchRoadmapSprints({ limit: 10, offset: kind === 'sprints' ? offset : 0, sprintStatus: selected, backlogLimit: 20, backlogOffset: kind === 'backlog' ? offset : 0 }, abort.signal).then(data => {
      if (!current) return;
      const items = (kind === 'sprints' ? data.sprints : data.backlog) as unknown as T[];
      setPage(p => ({ items: offset ? append(p.items, items) : items, offset: offset + items.length, total: (kind === 'sprints' ? data.total : data.backlog_total) ?? items.length, more: (kind === 'sprints' ? data.has_more : data.backlog_has_more) ?? false, loading: false, error: false }));
    }).catch(() => { if (current) setPage(p => ({ ...p, loading: false, error: true })); });
    return () => { current = false; abort.abort(); };
  }, [client, kind, filter, request]);
  return { page, more: () => setRequest({ offset: page.offset, retry: 0 }), retry: () => setRequest(r => ({ ...r, retry: r.retry + 1 })) };
}
function PageControls({ page, more, retry, name }: { page: Page<unknown>; more: () => void; retry: () => void; name: string }) {
  return <>
    {page.loading && <p role="status">Carregando {name}...</p>}
    {page.error && <div role="alert">Não foi possível carregar {name}. <button type="button" className="snaps-button" onClick={retry}>Tentar novamente {name}</button></div>}
    {page.more && !page.error && <button type="button" className="snaps-button" disabled={page.loading} onClick={more}>Carregar mais {name}</button>}
  </>;
}
function SprintPages({ client, selected }: { client: SnapsPublicClient; selected: SprintStatus[] }) {
  const controls = usePages<SnapsSprint>(client, selected, 'sprints');
  return <section aria-label="Sprints" className="space-y-4"><p>{controls.page.total} sprints</p>
    {!controls.page.loading && !controls.page.error && !controls.page.items.length && <p>Nenhuma sprint neste filtro.</p>}
    {controls.page.items.map(s => <SprintSection key={s.id} sprintName={s.name} sprintStatus={s.status} tag={s.tag} cards={s.cards || []} defaultExpanded={s.status === 'active'} />)}
    <PageControls {...controls} name="sprints" />
  </section>;
}
function BacklogPages({ client }: { client: SnapsPublicClient }) {
  const controls = usePages<SnapsCard>(client, [], 'backlog');
  return <section aria-label="Backlog" className="space-y-4"><p>{controls.page.total} itens no backlog</p>
    {!controls.page.loading && !controls.page.error && !controls.page.items.length && <p>Nenhum item no backlog.</p>}
    {!!controls.page.items.length && <SprintSection sprintName="Backlog de Pendências" sprintStatus="backlog" cards={controls.page.items} defaultExpanded />}
    <PageControls {...controls} name="backlog" />
  </section>;
}

