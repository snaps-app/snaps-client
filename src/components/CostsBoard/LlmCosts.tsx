import React, { useEffect, useState } from 'react';
import { CostPeriod, DecimalValue, LlmCostsResponse, LlmSummary, SnapsPublicClient } from '../../api/snaps-client';
export function usd(value: DecimalValue | null) { return value === null ? 'Desconhecido' : `USD ${Number(value).toFixed(8)}`; }
function Summary({ data }: { data: LlmSummary }) {
  return <dl className="grid gap-2 md:grid-cols-2">
    <div><dt>Total factual</dt><dd>{data.usage_count === 0 ? 'Sem uso registrado' : data.total_cost_usd === null ? 'Total factual indisponível' : usd(data.total_cost_usd)}</dd></div>
    <div><dt>Soma conhecida (cobertura {data.coverage === 'complete' ? 'completa' : data.coverage === 'partial' ? 'parcial' : 'ausente'})</dt><dd>{usd(data.known_cost_usd)}</dd></div>
    <div><dt>Estimativa não faturável</dt><dd>{usd(data.estimated_cost_usd)}</dd></div>
    <div><dt>Usos desconhecidos / pendentes</dt><dd>{data.unknown_count} / {data.pending_count}</dd></div>
  </dl>;
}
export function LlmCosts({ client, period }: { client: SnapsPublicClient; period: CostPeriod }) {
  const [conversationId, setConversationId] = useState(''); const [conversations, setConversations] = useState<string[]>([]);
  const [data, setData] = useState<LlmCostsResponse | null>(null); const [busy, setBusy] = useState(true); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true; const abort = new AbortController(); setBusy(true); setError(false);
    client.fetchLlmCosts({ ...period, conversationId }, abort.signal).then(value => { if (live) { setData(value); if (!conversationId) setConversations([...new Set(value.groups.map(g => g.conversation_id))]); } }).catch(() => { if (live) setError(true); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; abort.abort(); };
  }, [client, period.startDate, period.endDate, conversationId, retry]);
  return <section aria-label="IA do suporte" className="space-y-4"><h3 className="text-lg font-bold">IA do suporte — projeto inteiro no período (USD)</h3>
    <p>O filtro de pessoa afeta somente as horas. Custos de IA já incluem o valor calculado pelo servidor.</p>
    <label>Conversa (somente IA)<select aria-label="Conversa (somente IA)" value={conversationId} onChange={e => setConversationId(e.target.value)}><option value="">Todas as conversas</option>{conversations.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
    {conversationId && <p>Exibindo apenas a conversa selecionada. O relatório PDF mantém IA do projeto inteiro.</p>}
    {busy ? <p role="status">Carregando IA...</p> : error ? <p role="alert">Não foi possível carregar IA. <button type="button" className="snaps-button" onClick={() => setRetry(r => r + 1)}>Tentar novamente IA</button></p> : data && <>
      <Summary data={data} /><p>Início da cobertura: {data.coverage_started_at || 'Ainda não registrado'}. Base: {data.cost_basis}.</p>
      <p>Tokens: entrada sem cache {data.tokens.input_noncache_tokens ?? 'desconhecido'}; gravação de cache {data.tokens.cache_write_5m_tokens ?? 'desconhecido'}; leitura de cache {data.tokens.cache_read_tokens ?? 'desconhecido'}; saída {data.tokens.output_tokens ?? 'desconhecido'}. Usos com contagem incompleta: {data.tokens_unknown_count}.</p>
      <div className="overflow-x-auto"><table><caption>IA por dia, conversa e modelo (USD)</caption><thead><tr><th>Data</th><th>Conversa</th><th>Modelo</th><th>Custo factual</th><th>Soma conhecida</th><th>Estimativa não faturável</th><th>Desconhecidos / pendentes</th></tr></thead><tbody>{data.groups.map(g => <tr key={`${g.date}/${g.conversation_id}/${g.model}`}><td>{g.date}</td><td>{g.conversation_id}</td><td>{g.model}</td><td>{usd(g.total_cost_usd)}</td><td>{usd(g.known_cost_usd)}</td><td>{usd(g.estimated_cost_usd)}</td><td>{g.unknown_count} / {g.pending_count}</td></tr>)}</tbody></table></div>
    </>}
  </section>;
}
