import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Download, Sparkles } from 'lucide-react';
import { CostPeriod, currentMonth, HoursResponse, Person, saveReport, SnapsPublicClient, validPeriod } from '../../api/snaps-client';
import { LlmCosts } from './LlmCosts';
export interface CostsBoardProps { projectId: string; apiKey: string; apiUrl?: string; }
export function CostsBoard(props: CostsBoardProps) { return <CostsView key={JSON.stringify([props.projectId, props.apiKey, props.apiUrl])} {...props} />; }
function CostsView({ projectId, apiKey, apiUrl }: CostsBoardProps) {
  const client = useMemo(() => new SnapsPublicClient({ projectId, apiKey, apiUrl }), [projectId, apiKey, apiUrl]);
  const [tab, setTab] = useState<'time' | 'ai'>('time');
  const [period, setPeriod] = useState(currentMonth); const [draft, setDraft] = useState(period); const [personId, setPersonId] = useState('');
  const [people, setPeople] = useState<Person[]>([]); const [error, setError] = useState(''); const [reportBusy, setReportBusy] = useState(false);
  const receivePeople = useCallback((value: Person[]) => setPeople(value), []);
  const report = async () => {
    setReportBusy(true); setError('');
    try { saveReport(await client.fetchCostsReport({ ...period, personId })); }
    catch { setError('Relatório PDF indisponível. Tente emitir novamente.'); }
    finally { setReportBusy(false); }
  };
  return <div className="snaps-costs space-y-6">
    <header className="snaps-costs-heading"><div><h2>Custos do projeto</h2><p>Tempo da equipe e consumo de IA do suporte.</p></div><button type="button" className="snaps-button" disabled={reportBusy} onClick={() => { void report(); }}><Download size={16} aria-hidden="true" />{reportBusy ? 'Emitindo relatório...' : 'Emitir relatório PDF'}</button></header>
    <div role="tablist" aria-label="Visão de custos" className="snaps-cost-tabs" onKeyDown={e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault(); const next = e.key === 'Home' ? 'time' : e.key === 'End' ? 'ai' : tab === 'time' ? 'ai' : 'time';
      setTab(next); e.currentTarget.querySelector<HTMLButtonElement>('#snaps-cost-tab-' + next)?.focus();
    }}>
      <button type="button" role="tab" id="snaps-cost-tab-time" aria-controls="snaps-cost-panel-time" aria-selected={tab === 'time'} tabIndex={tab === 'time' ? 0 : -1} onClick={() => setTab('time')}><Clock size={17} aria-hidden="true" />Tempo</button>
      <button type="button" role="tab" id="snaps-cost-tab-ai" aria-controls="snaps-cost-panel-ai" aria-selected={tab === 'ai'} tabIndex={tab === 'ai' ? 0 : -1} onClick={() => setTab('ai')}><Sparkles size={17} aria-hidden="true" />IA de suporte</button>
    </div>
    <form className="snaps-cost-filters" onSubmit={e => { e.preventDefault(); if (!validPeriod(draft)) { setError('Selecione um período de 1 a 366 dias, com início até o fim.'); return; } setError(''); if (period.startDate !== draft.startDate || period.endDate !== draft.endDate) setPeople([]); setPeriod({ ...draft }); setPersonId(''); }}>
      <label>Início<input type="date" aria-label="Início" value={draft.startDate} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} /></label>
      <label>Fim<input type="date" aria-label="Fim" value={draft.endDate} onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))} /></label>
      <button type="submit" className="snaps-button">Aplicar período</button>
      {tab === 'time' && <label className="snaps-person-filter">Colaborador<select aria-label="Pessoa (somente horas)" value={personId} onChange={e => setPersonId(e.target.value)}><option value="">Todos os colaboradores</option>{people.map(p => <option key={p.id} value={p.id}>{p.display_name} ({p.id})</option>)}</select></label>}
    </form>
    {error && <p role="alert">{error}</p>}
    <div role="tabpanel" id="snaps-cost-panel-time" aria-labelledby="snaps-cost-tab-time" hidden={tab !== 'time'}>
      <HoursPanel key={`${period.startDate}/${period.endDate}/${personId}`} client={client} period={period} personId={personId} onPeople={receivePeople} />
      <p className="snaps-cost-note">Valor/hora: indisponível</p>
    </div>
    <div role="tabpanel" id="snaps-cost-panel-ai" aria-labelledby="snaps-cost-tab-ai" hidden={tab !== 'ai'}><LlmCosts key={`${period.startDate}/${period.endDate}`} client={client} period={period} /></div>
    <footer className="snaps-cost-note">Período inclusivo: {period.startDate} a {period.endDate} (America/Sao_Paulo). O PDF inclui as horas do colaborador selecionado e a IA do projeto inteiro, sem filtro de conversa.</footer>
  </div>;
}
export function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return <div className="snaps-metric"><dt>{label}</dt><dd>{value}</dd>{detail && <p>{detail}</p>}</div>;
}
const hoursLabel = (value: string | number) => Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' h';
function HoursPanel({ client, period, personId, onPeople }: { client: SnapsPublicClient; period: CostPeriod; personId: string; onPeople: (p: Person[]) => void }) {
  const [data, setData] = useState<HoursResponse | null>(null); const [offset, setOffset] = useState(0); const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(true); const [error, setError] = useState(false);
  useEffect(() => {
    let live = true; const abort = new AbortController(); setBusy(true); setError(false);
    client.fetchHours({ ...period, personId, offset, limit: 100 }, abort.signal).then(value => { if (live) { setData(value); if (!personId) onPeople(value.people); } }).catch(() => { if (live) setError(true); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; abort.abort(); };
  }, [client, period.startDate, period.endDate, personId, offset, retry, onPeople]);
  const names = new Map(data?.people.map(p => [p.id, p.display_name]));
  const groups = new Map<string, { title: string; hours: number; logs: HoursResponse['items'] }>();
  for (const log of data?.items || []) {
    const key = log.reference_id || 'unlinked';
    if (!groups.has(key)) groups.set(key, { title: log.reference_title || 'Outros apontamentos', hours: 0, logs: [] });
    const group = groups.get(key)!; group.hours += Number(log.hours); group.logs.push(log);
  }
  return <section aria-label="Horas confirmadas" className="snaps-hours space-y-6">
    {busy ? <p role="status">Carregando horas...</p> : error ? <p role="alert">Não foi possível carregar horas. <button type="button" className="snaps-button" onClick={() => setRetry(r => r + 1)}>Tentar novamente horas</button></p> : data && <>
      <dl className="snaps-metrics"><Metric label="Total de horas" value={hoursLabel(data.total_hours)} detail="Apontamentos confirmados no período" /><Metric label="Apontamentos" value={data.total.toLocaleString('pt-BR')} detail="Registros confirmados" /><Metric label="Colaboradores" value={data.people.length} detail="Com horas no período selecionado" /></dl>
      {!data.series.length ? <p>Sem horas confirmadas neste período.</p> : <details className="snaps-hours-chart"><summary>Horas por dia e colaborador</summary>
        <svg role="img" aria-label="Horas por dia e pessoa; valores na tabela abaixo" viewBox="0 0 700 160" className="w-full"><title>Horas por dia e pessoa</title>{data.people.map((p, i) => {
          const dates = [...new Set(data.series.map(s => s.date))].sort(), values = new Map(data.series.filter(s => s.person_id === p.id).map(v => [v.date, v.hours])), max = Math.max(1, ...data.series.map(s => Number(s.hours)));
          const color = ['var(--snaps-primary)', 'var(--snaps-success)', 'var(--snaps-warning)', 'var(--snaps-error)'][i % 4];
          return <g key={p.id}><polyline fill="none" stroke={color} strokeWidth="3" points={dates.map((date, n) => `${20 + n * 650 / Math.max(1, dates.length - 1)},${140 - Number(values.get(date) || 0) / max * 120}`).join(' ')} /><title>{p.display_name} ({p.id})</title></g>;
        })}</svg>
        <div className="overflow-x-auto"><table><caption>Horas diárias por pessoa</caption><thead><tr><th>Data</th><th>Pessoa</th><th>Horas</th></tr></thead><tbody>{data.series.map(p => <tr key={`${p.date}/${p.person_id}`}><td>{p.date}</td><td>{names.get(p.person_id)} ({p.person_id})</td><td>{hoursLabel(p.hours)}</td></tr>)}</tbody></table></div>
      </details>}
      {!!data.items.length && <div className="snaps-time-report"><h3>Apontamentos por atividade</h3><p className="snaps-cost-note">Exibindo {offset + 1}–{offset + data.items.length} de {data.total}. Subtotais por atividade consideram esta página.</p>
        {[...groups].sort((a, b) => b[1].hours - a[1].hours).map(([key, group]) => <details key={key} className="snaps-time-group"><summary><span>{group.title}<small>{group.logs.length} apontamento{group.logs.length !== 1 ? 's' : ''} nesta página</small></span><strong>{hoursLabel(group.hours)}</strong></summary>
          <div className="overflow-x-auto"><table><caption className="sr-only">Registros de {group.title}</caption><thead><tr><th>Data</th><th>Colaborador</th><th>Descrição</th><th>Horas</th></tr></thead><tbody>{group.logs.map(l => <tr key={l.id}><td>{l.date.split('-').reverse().join('/')}</td><td>{names.get(l.person_id) || 'Pessoa'} ({l.person_id})</td><td>{l.description || '—'}</td><td>{hoursLabel(l.hours)}</td></tr>)}</tbody></table></div>
        </details>)}
      </div>}
      {data.total > 100 && <div className="flex gap-2"><button type="button" className="snaps-button" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 100))}>Registros anteriores</button><button type="button" className="snaps-button" disabled={!data.has_more} onClick={() => setOffset(offset + 100)}>Próximos registros</button></div>}
    </>}
  </section>;
}
