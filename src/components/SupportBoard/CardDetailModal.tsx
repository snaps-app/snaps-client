import React, { useState } from 'react';
import { SnapsCard, SnapsPublicClient } from '../../api/snaps-client';
import { MarkdownRenderer, StatusPill, SeverityBadge } from '../shared';
import { BugReportForm } from '../BugReportForm';
import { FeatureRequestForm } from '../FeatureRequestForm';

export interface CardDetailModalProps {
  card: SnapsCard; projectId: string; apiKey: string; apiUrl?: string;
  onClose: () => void; onRefresh: () => void;
}
export function CardDetailModal({ card, projectId, apiKey, apiUrl, onClose, onRefresh }: CardDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(card);
  const Form = current.card_type === 'bug' ? BugReportForm : FeatureRequestForm;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40">
    <section role="dialog" aria-modal="true" aria-label={current.title} className="bg-white rounded-xl max-w-3xl w-full shadow-2xl border max-h-[90vh] overflow-y-auto p-5 space-y-4">
      <header className="flex justify-between gap-3"><h2 className="text-xl font-bold">{current.title}</h2><button type="button" className="snaps-button" onClick={onClose} aria-label="Fechar chamado">Fechar</button></header>
      <div className="flex gap-2"><span>{current.code}</span><StatusPill status={current.status} />{current.card_type === 'bug' && <SeverityBadge severity={current.card_metadata?.severity} />}</div>
      {editing ? <Form projectId={projectId} apiKey={apiKey} apiUrl={apiUrl} initialValues={current}
        onEditSubmit={payload => new SnapsPublicClient({ projectId, apiKey, apiUrl }).updateSupportCard(current.id, payload)}
        onCancel={() => setEditing(false)} onSuccess={updated => { setCurrent(updated); setEditing(false); onRefresh(); }} />
        : <><MarkdownRenderer content={current.description || 'Sem descrição fornecida.'} />
          {current.status === 'new-issues' && current.editable !== false
            ? <button type="button" className="snaps-button" onClick={() => setEditing(true)}>Editar</button>
            : <p>A edição está disponível somente antes da triagem.</p>}</>}
    </section>
  </div>;
}

