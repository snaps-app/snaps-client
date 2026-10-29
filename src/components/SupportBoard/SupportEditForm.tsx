import React, { useRef, useState } from 'react';
import { CardMetadata, SnapsCard, SnapsHttpError, SnapsPublicClient, SupportCardEdit } from '../../api/snaps-client';
import { FileUploadZone } from '../shared';

export interface SupportEditFormProps {
  initialValues: SnapsCard;
  projectId: string; apiKey: string; apiUrl?: string;
  onEditSubmit?: (payload: SupportCardEdit) => Promise<SnapsCard>;
  onSuccess?: (card: SnapsCard) => void; onCancel?: () => void;
}
const fields: [keyof CardMetadata, string, 'text' | 'boolean'][] = [
  ['application', 'Aplicação', 'text'], ['module', 'Módulo / tela', 'text'],
  ['actual_behavior', 'O que aconteceu', 'text'], ['expected_behavior', 'O que deveria acontecer', 'text'], ['steps_to_reproduce', 'Passos para reproduzir', 'text'],
  ['severity', 'Severidade', 'text'], ['frequency', 'Frequência', 'text'], ['users_affected', 'Usuários afetados', 'text'],
  ['blocks_critical_flow', 'Bloqueia fluxo crítico', 'boolean'], ['has_workaround', 'Existe alternativa', 'boolean'],
  ['workaround_description', 'Descrição da alternativa', 'text'], ['problem_or_opportunity', 'Dor / oportunidade', 'text'],
  ['proposed_solution', 'Solução proposta', 'text'], ['expected_impact', 'Impacto esperado', 'text'], ['priority_justification', 'Justificativa de prioridade', 'text'],
  ['browser', 'Navegador', 'text'], ['os', 'Sistema operacional', 'text'], ['screen_resolution', 'Resolução', 'text'], ['app_version', 'Versão do aplicativo', 'text'],
];
export function SupportEditForm({ initialValues, projectId, apiKey, apiUrl, onEditSubmit, onSuccess, onCancel }: SupportEditFormProps) {
  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description || '');
  const [delta, setDelta] = useState<CardMetadata>({});
  const [files, setFiles] = useState<File[]>([]);
  const uploads = useRef(new Map<File, string>());
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const metadata: CardMetadata = { ...initialValues.card_metadata, ...delta };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return;
    if (!title.trim() || title.trim().length > 200) { setError('Informe um título de até 200 caracteres.'); return; }
    setBusy(true); setError('');
    const client = new SnapsPublicClient({ projectId, apiKey, apiUrl });
    try {
      for (const file of files) if (!uploads.current.has(file)) uploads.current.set(file, (await client.uploadAttachment(file)).url);
      const urls = files.map(f => uploads.current.get(f)!);
      const card_metadata = { ...delta, ...(urls.length ? { attachment_urls: [...(metadata.attachment_urls || []), ...urls] } : {}) };
      const payload = { title: title.trim(), description: description + urls.map(u => `\n\n![Anexo](${u})`).join(''), card_metadata };
      const card = await (onEditSubmit ? onEditSubmit(payload) : client.updateSupportCard(initialValues.id, payload));
      onSuccess?.(card);
    } catch (e) {
      setError(e instanceof SnapsHttpError && e.status === 409 ? 'O chamado entrou em triagem e não pode mais ser editado. Seu rascunho foi mantido para copiar.' : 'Não foi possível salvar. Seu rascunho foi mantido; tente novamente.');
    } finally { setBusy(false); }
  };
  return <form onSubmit={save} className="space-y-4">
    <label className="block">Título<input aria-label="Título" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} className="w-full border rounded p-2" /></label>
    <p className="text-sm">A descrição original é preservada. Edite o texto completo para ajustar passos, aplicação e comportamento.</p>
    <label className="block">Descrição<textarea aria-label="Descrição" value={description} onChange={e => setDescription(e.target.value)} rows={12} className="w-full border rounded p-2" /></label>
    <fieldset className="grid gap-3 md:grid-cols-2"><legend>Campos do formulário</legend>
      {fields.filter(([key]) => initialValues.card_type === 'bug' ? !['problem_or_opportunity', 'proposed_solution', 'expected_impact', 'priority_justification'].includes(key) : !['severity', 'frequency', 'users_affected', 'blocks_critical_flow', 'has_workaround', 'workaround_description'].includes(key)).map(([key, label, type]) => <label key={key} className="block">{label}{type === 'boolean'
        ? <input type="checkbox" aria-label={label} checked={Boolean(metadata[key])} onChange={e => setDelta(d => ({ ...d, [key]: e.target.checked }))} />
        : <input aria-label={label} className="w-full border rounded p-2" value={String(metadata[key] ?? '')} onChange={e => setDelta(d => ({ ...d, [key]: e.target.value }))} />}</label>)}
    </fieldset>
    {!!metadata.attachment_urls?.length && <ul aria-label="Anexos existentes">{metadata.attachment_urls.map((u, i) => <li key={u}><a href={/^https?:\/\//.test(u) ? u : undefined} target="_blank" rel="noopener noreferrer">Anexo existente {i + 1}</a></li>)}</ul>}
    <FileUploadZone files={files} onFilesChange={setFiles} />
    {error && <p role="alert">{error}</p>}
    <div className="flex gap-2"><button className="snaps-button" type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar alterações'}</button><button className="snaps-button" type="button" onClick={onCancel} disabled={busy}>Voltar ao chamado</button></div>
  </form>;
}
