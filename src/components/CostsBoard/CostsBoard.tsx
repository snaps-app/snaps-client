import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CostPeriod, currentMonth, HoursResponse, Person, saveReport, SnapsPublicClient, validPeriod } from '../../api/snaps-client';
import { LlmCosts } from './LlmCosts';

export interface CostsBoardProps { projectId: string; apiKey: string; apiUrl?: string; }
export function CostsBoard(props: CostsBoardProps) { return <CostsView key={JSON.stringify([props.projectId, props.apiKey, props.apiUrl])} {...props} />; }
function CostsView({ projectId, apiKey, apiUrl }: CostsBoardProps) {
  const client = useMemo(() => new SnapsPublicClient({ projectId, apiKey, apiUrl }), [projectId, apiKey, apiUrl]);
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
    <header><h2 className="text-2xl font-bold">Custos do projeto</h2><p>Horas confirmadas e IA do suporte no período selecionado.</p></header>
    <form className="flex flex-wrap gap-3 items-end" onSubmit={e => { e.preventDefault(); if (!validPeriod(draft)) { setError('Selecione um período de 1 a 366 dias, com início até o fim.'); return; } setError(''); setPeriod({ ...draft }); setPersonId(''); setPeople([]); }}>
      <label>Início<input type="date" aria-label="Início" value={draft.startDate} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} /></label>
      <label>Fim<input type="date" aria-label="Fim" value={draft.endDate} onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))} /></label>
      <button type="submit" className="snaps-button">Aplicar período</button>
    </form>
    <p>Período inclusivo: {period.startDate} a {period.endDate} (America/Sao_Paulo).</p>
    <label className="block">Pessoa (somente horas)<select aria-label="Pessoa (somente horas)" value={personId} onChange={e => setPersonId(e.target.value)}><option value="">Todas</option>{people.map(p => <option key={p.id} value={p.id}>{p.display_name} ({p.id})</option>)}</select></label>
    <HoursPanel key={`${period.startDate}/${period.endDate}/${personId}`} client={client} period={period} personId={personId} onPeople={receivePeople} />
    <LlmCosts key={`${period.startDate}/${period.endDate}`} client={client} period={period} />
    <footer className="space-y-2"><p>Valor/hora: indisponível</p><p>O relatório inclui horas da pessoa selecionada e IA do projeto inteiro no período, sem filtro de conversa.</p><button type="button" className="snaps-button" disabled={reportBusy} onClick={() => { void report(); }}>{reportBusy ? 'Emitindo relatório...' : 'Emitir relatório PDF'}</button>{error && <p role="alert">{error}</p>}</footer>
  </div>;
}
function HoursPanel({ client, period, personId, onPeople }: { client: SnapsPublicClient; period: CostPeriod; personId: string; onPeople: (p: Person[]) => void }) {
  const [data, setData] = useState<HoursResponse | null>(null); const [offset, setOffset] = useState(0); const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(true); const [error, setError] = useState(false);
  useEffect(() => {
    let live = true; const abort = new AbortController(); setBusy(true); setError(false);
    client.fetchHours({ ...period, personId, offset, limit: 100 }, abort.signal).then(value => {
      if (live) { setData(value); if (!personId) onPeople(value.people); }
    }).catch(() => { if (live) setError(true); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; abort.abort(); };
  }, [client, period.startDate, period.endDate, personId, offset, retry, onPeople]);
  const names = new Map(data?.people.map(p => [p.id, p.display_name]));
  return <section aria-label="Horas confirmadas" className="space-y-3"><h3 className="text-lg font-bold">Horas confirmadas</h3>
    {busy ? <p role="status">Carregando horas...</p> : error ? <p role="alert">Não foi possível carregar horas. <button type="button" className="snaps-button" onClick={() => setRetry(r => r + 1)}>Tentar novamente horas</button></p> : data && <>
      <p>Total de horas: {data.total_hours}</p>{!data.series.length ? <p>Sem horas confirmadas neste período.</p> : <>
        <svg role="img" aria-label="Horas por dia e pessoa; valores na tabela abaixo" viewBox="0 0 700 160" className="w-full"><title>Horas por dia e pessoa</title>{data.people.map((p, i) => {
          const values = data.series.filter(s => s.person_id === p.id); const dates = [...new Set(data.series.map(s => s.date))].sort(); const max = Math.max(1, ...data.series.map(s => Number(s.hours)));
          return <polyline key={p.id} fill="none" stroke={['var(--snaps-primary)', 'var(--snaps-success)', 'var(--snaps-warning)', 'var(--snaps-error)'][i % 4]} strokeWidth="3" points={values.map(v => `${20 + dates.indexOf(v.date) * 650 / Math.max(1, dates.length - 1)},${140 - Number(v.hours) / max * 120}`).join(' ')}><title>{p.display_name} ({p.id})</title></polyline>;
        })}</svg>
        <div className="overflow-x-auto"><table><caption>Horas diárias por pessoa</caption><thead><tr><th>Data</th><th>Pessoa</th><th>Horas</th></tr></thead><tbody>{data.series.map(p => <tr key={`${p.date}/${p.person_id}`}><td>{p.date}</td><td>{names.get(p.person_id)} ({p.person_id})</td><td>{p.hours}</td></tr>)}</tbody></table></div>
      </>}
      <div className="overflow-x-auto"><table><caption>Registros confirmados — {data.total} no período</caption><thead><tr><th>Data</th><th>Pessoa</th><th>Descrição</th><th>Horas</th></tr></thead><tbody>{data.items.map(l => <tr key={l.id}><td>{l.date}</td><td>{names.get(l.person_id) || 'Pessoa'} ({l.person_id})</td><td>{l.description}</td><td>{l.hours}</td></tr>)}</tbody></table></div>
      <div className="flex gap-2"><button type="button" className="snaps-button" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 100))}>Registros anteriores</button><button type="button" className="snaps-button" disabled={!data.has_more} onClick={() => setOffset(offset + 100)}>Próximos registros</button></div>
    </>}
  </section>;
}
