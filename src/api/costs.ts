export type DecimalValue = string | number;
export interface CostPeriod { startDate: string; endDate: string; }
export interface HoursOptions extends CostPeriod { personId?: string; limit?: number; offset?: number; }
export interface Person { id: string; display_name: string; }
export interface HourPoint { date: string; person_id: string; hours: DecimalValue; }
export interface HoursResponse {
  start_date: string; end_date: string; person_id: string | null; people: Person[]; series: HourPoint[]; total_hours: DecimalValue;
  items: (HourPoint & { id: string; description: string | null })[]; total: number; limit: number; offset: number; has_more: boolean;
}
export interface LlmSummary {
  currency: 'USD'; usage_count: number; known_cost_usd: DecimalValue | null; total_cost_usd: DecimalValue | null; estimated_cost_usd: DecimalValue | null;
  estimate_billable: false; unknown_count: number; pending_count: number; coverage: 'none' | 'partial' | 'complete'; cost_basis: string;
  tokens: { input_noncache_tokens: number | null; cache_write_5m_tokens: number | null; cache_read_tokens: number | null; output_tokens: number | null }; tokens_unknown_count: number;
}
export interface LlmCostsResponse extends LlmSummary {
  start_date: string; end_date: string; scope: string; conversation_id: string | null; coverage_started_at: string | null;
  groups: (LlmSummary & { date: string; conversation_id: string; model: string })[];
}
export function currentMonth(now = new Date()): CostPeriod {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(now);
  const year = parts.find(x => x.type === 'year')!.value; const month = parts.find(x => x.type === 'month')!.value;
  const last = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return { startDate: `${year}-${month}-01`, endDate: `${year}-${month}-${last}` };
}
export function validPeriod(period: CostPeriod) {
  const days = (Date.parse(period.endDate) - Date.parse(period.startDate)) / 86400000;
  return /^\d{4}-\d{2}-\d{2}$/.test(period.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(period.endDate) && Number.isFinite(days) && days >= 0 && days < 366;
}
export function saveReport(blob: Blob) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'snaps-costs.pdf'; document.body.append(a);
  try { a.click(); } finally { a.remove(); URL.revokeObjectURL(url); }
}
