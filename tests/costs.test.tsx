import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CostsBoard } from '../src/components/CostsBoard';
import { SnapsPublicClient } from '../src/api/snaps-client';
const hours = { start_date: '2026-10-01', end_date: '2026-10-31', person_id: null, people: [{ id: 'a', display_name: 'Ana' }, { id: 'b', display_name: 'Ana' }], series: [{ date: '2026-10-23', person_id: 'a', hours: 2 }], total_hours: 2, items: [], total: 0, limit: 100, offset: 0, has_more: false };
const ai = { start_date: '2026-10-01', end_date: '2026-10-31', currency: 'USD', usage_count: 2, known_cost_usd: '1.20', total_cost_usd: null, estimated_cost_usd: '0.50', estimate_billable: false, unknown_count: 1, pending_count: 1, coverage: 'partial', cost_basis: 'estimated', coverage_started_at: null, tokens: { input_noncache_tokens: 5, cache_write_5m_tokens: 0, cache_read_tokens: null, output_tokens: 3 }, tokens_unknown_count: 1, groups: [], scope: 'project_support', conversation_id: null };
it('filters hours by stable person ID while AI remains project-wide', async () => {
  const h = vi.spyOn(SnapsPublicClient.prototype, 'fetchHours').mockResolvedValue(hours);
  const llm = vi.spyOn(SnapsPublicClient.prototype, 'fetchLlmCosts').mockResolvedValue(ai);
  render(<CostsBoard projectId="p" apiKey="key" />);
  await screen.findByRole('option', { name: 'Ana (b)' });
  fireEvent.change(screen.getByLabelText('Pessoa (somente horas)'), { target: { value: 'b' } });
  await waitFor(() => expect(h).toHaveBeenLastCalledWith(expect.objectContaining({ personId: 'b', offset: 0 }), expect.any(AbortSignal)));
  fireEvent.click(screen.getByRole('tab', { name: 'IA de suporte' }));
  expect(screen.getByRole('tabpanel', { name: 'IA de suporte' }).hidden).toBe(false);
  expect(screen.queryByLabelText('Pessoa (somente horas)')).toBeNull();
  expect(llm).toHaveBeenCalledTimes(1); expect(screen.getByText(/IA do suporte — projeto inteiro/)).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: 'Tempo' }));
  expect((screen.getByLabelText('Pessoa (somente horas)') as HTMLSelectElement).value).toBe('b');
});
it.each([['none', 0, null, 'Sem uso registrado'], ['complete', 1, '0', 'USD 0.00000000'], ['partial', 2, null, 'Total factual indisponível']])('distinguishes %s coverage from zero', async (coverage, count, total, label) => {
  vi.spyOn(SnapsPublicClient.prototype, 'fetchHours').mockResolvedValue(hours);
  vi.spyOn(SnapsPublicClient.prototype, 'fetchLlmCosts').mockResolvedValue({ ...ai, coverage, usage_count: count, total_cost_usd: total } as never);
  render(<CostsBoard projectId="p" apiKey="key" />); fireEvent.click(screen.getByRole('tab', { name: 'IA de suporte' })); await screen.findByText(label); expect(screen.getByText('Valor/hora: indisponível')).toBeTruthy();
});
it('refuses an HTML response instead of saving it as a PDF', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>erro</html>', { headers: { 'Content-Type': 'text/html' } })));
  await expect(new SnapsPublicClient({ projectId: 'p', apiKey: 'key' }).fetchCostsReport({ startDate: '2026-10-01', endDate: '2026-10-31' })).rejects.toThrow('PDF');
});

it('groups report rows by stable activity and shows page subtotals separately from period totals', async () => {
  vi.spyOn(SnapsPublicClient.prototype, 'fetchHours').mockResolvedValue({ ...hours, total_hours: 110, total: 101, items: [
    { id:'l1',date:'2026-10-23',person_id:'a',hours:2,description:'Primeiro',reference_id:'card:one',reference_title:'Mesma atividade' },
    { id:'l2',date:'2026-10-23',person_id:'b',hours:3,description:'Segundo',reference_id:'card:two',reference_title:'Mesma atividade' },
  ] });
  vi.spyOn(SnapsPublicClient.prototype, 'fetchLlmCosts').mockResolvedValue(ai);
  render(<CostsBoard projectId="p" apiKey="key" />);
  await screen.findByText('110 h'); expect(screen.getAllByText('Mesma atividade')).toHaveLength(2);
  expect(screen.getByText(/Subtotais por atividade consideram esta página/)).toBeTruthy();
  const time = screen.getByRole('tab', {name:'Tempo'}); fireEvent.keyDown(time, {key:'ArrowRight'});
  expect(screen.getByRole('tab', {name:'IA de suporte'}).getAttribute('aria-selected')).toBe('true');
});
it('paginates confirmed logs independently of the AI query', async () => {
  const h = vi.spyOn(SnapsPublicClient.prototype, 'fetchHours').mockResolvedValueOnce({ ...hours, has_more: true, total: 101 }).mockResolvedValue({ ...hours, offset: 100 });
  const l = vi.spyOn(SnapsPublicClient.prototype, 'fetchLlmCosts').mockResolvedValue(ai);
  render(<CostsBoard projectId="p" apiKey="key" />);
  await screen.findAllByText('2 h'); fireEvent.click(screen.getByRole('button', { name: 'Próximos registros' }));
  await waitFor(() => expect(h).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 100 }), expect.any(AbortSignal))); expect(l).toHaveBeenCalledTimes(1);
});
it('does not send an inverted period', async () => {
  const h = vi.spyOn(SnapsPublicClient.prototype, 'fetchHours').mockResolvedValue(hours); vi.spyOn(SnapsPublicClient.prototype, 'fetchLlmCosts').mockResolvedValue(ai);
  render(<CostsBoard projectId="p" apiKey="key" />); await screen.findAllByText('2 h');
  fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2026-11-01' } }); fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2026-10-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar período' })); expect(screen.getByRole('alert').textContent).toContain('366'); expect(h).toHaveBeenCalledTimes(1);
});
