import React, { useRef, useState } from 'react';
import { SnapsCard, SnapsHttpError, SnapsPublicClient, SupportCardEdit } from '../../api/snaps-client';

export interface SupportEditFormProps {
  initialValues: SnapsCard;
  projectId: string; apiKey: string; apiUrl?: string;
  onEditSubmit?: (payload: SupportCardEdit) => Promise<SnapsCard>;
  onSuccess?: (card: SnapsCard) => void; onCancel?: () => void;
}
export function SupportEditForm({ initialValues, projectId, apiKey, apiUrl, onEditSubmit, onSuccess, onCancel }: SupportEditFormProps) {
  const [description, setDescription] = useState(initialValues.description || '');
  const saving = useRef(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (saving.current) return;
    saving.current = true;
    setBusy(true); setError('');
    const client = new SnapsPublicClient({ projectId, apiKey, apiUrl });
    try {
      const payload = { description };
      const card = await (onEditSubmit ? onEditSubmit(payload) : client.updateSupportCard(initialValues.id, payload));
      onSuccess?.(card);
    } catch (e) {
      setError(e instanceof SnapsHttpError && e.status === 409 ? 'O chamado entrou em triagem e não pode mais ser editado. Seu rascunho foi mantido para copiar.' : 'Não foi possível salvar. Seu rascunho foi mantido; tente novamente.');
    } finally { saving.current = false; setBusy(false); }
  };
  return <form onSubmit={save} className="space-y-4">
    <p className="text-sm">A descrição original é preservada. Edite o texto completo para ajustar passos, aplicação e comportamento.</p>
    <label className="block">Descrição<textarea aria-label="Descrição" value={description} onChange={e => setDescription(e.target.value)} rows={12} className="w-full border rounded p-2" /></label>
    {error && <p role="alert">{error}</p>}
    <div className="flex gap-2"><button className="snaps-button" type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar alterações'}</button><button className="snaps-button" type="button" onClick={onCancel} disabled={busy}>Voltar ao chamado</button></div>
  </form>;
}
