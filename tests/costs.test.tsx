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
  expect(llm).toHaveBeenCalledTimes(1); expect(screen.getByText(/IA do suporte — projeto inteiro/)).toBeTruthy();
});
it.each([['none', 0, null, 'Sem uso registrado'], ['complete', 1, '0', 'USD 0.00000000'], ['partial', 2, null, 'Total factual indisponível']])('distinguishes %s coverage from zero', async (coverage, count, total, label) => {
  vi.spyOn(SnapsPublicClient.prototype, 'fetchHours').mockResolvedValue(hours);
  vi.spyOn(SnapsPublicClient.prototype, 'fetchLlmCosts').mockResolvedValue({ ...ai, coverage, usage_count: count, total_cost_usd: total } as never);
  render(<CostsBoard projectId="p" apiKey="key" />); await screen.findByText(label); expect(screen.getByText('Valor/hora: indisponível')).toBeTruthy();
});
it('refuses an HTML response instead of saving it as a PDF', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>erro</html>', { headers: { 'Content-Type': 'text/html' } })));
  await expect(new SnapsPublicClient({ projectId: 'p', apiKey: 'key' }).fetchCostsReport({ startDate: '2026-10-01', endDate: '2026-10-31' })).rejects.toThrow('PDF');
});
it('paginates confirmed logs independently of the AI query', async () => {
  const h = vi.spyOn(SnapsPublicClient.prototype, 'fetchHours').mockResolvedValueOnce({ ...hours, has_more: true, total: 101 }).mockResolvedValue({ ...hours, offset: 100 });
  const l = vi.spyOn(SnapsPublicClient.prototype, 'fetchLlmCosts').mockResolvedValue(ai);
  render(<CostsBoard projectId="p" apiKey="key" />);
  await screen.findByText('Total de horas: 2'); fireEvent.click(screen.getByRole('button', { name: 'Próximos registros' }));
  await waitFor(() => expect(h).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 100 }), expect.any(AbortSignal))); expect(l).toHaveBeenCalledTimes(1);
});
it('does not send an inverted period', async () => {
  const h = vi.spyOn(SnapsPublicClient.prototype, 'fetchHours').mockResolvedValue(hours); vi.spyOn(SnapsPublicClient.prototype, 'fetchLlmCosts').mockResolvedValue(ai);
  render(<CostsBoard projectId="p" apiKey="key" />); await screen.findByText('Total de horas: 2');
  fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2026-11-01' } }); fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2026-10-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar período' })); expect(screen.getByRole('alert').textContent).toContain('366'); expect(h).toHaveBeenCalledTimes(1);
});
