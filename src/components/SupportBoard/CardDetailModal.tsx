import React, { useState } from 'react';
import { SnapsCard, SnapsPublicClient } from '../../api/snaps-client';
import { MarkdownRenderer, ConfirmDialog, toast, StatusPill, SeverityBadge } from '../shared';
import { X, Copy, Trash2, Loader2, Check } from 'lucide-react';
import { formatRelativeTime } from './CardRow';

export interface CardDetailModalProps {
  card: SnapsCard;
  projectId: string;
  apiKey: string;
  apiUrl?: string;
  onClose: () => void;
  onRefresh: () => void;
}

const STATUS_OPTIONS = [
  { value: 'todo', label: 'A Fazer' },
  { value: 'in_progress', label: 'Em Progresso' },
  { value: 'assurance', label: 'Em Validação' },
  { value: 'done', label: 'Concluído' },
  { value: 'backlog', label: 'Backlog' },
];

export function CardDetailModal({
  card,
  projectId,
  apiKey,
  apiUrl,
  onClose,
  onRefresh,
}: CardDetailModalProps) {
  const [status, setStatus] = useState(card.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const client = new SnapsPublicClient({ projectId, apiKey, apiUrl });

  const handleUpdateStatus = async () => {
    setIsUpdatingStatus(true);
    try {
      await client.updateCardStatus(card.id, status);
      toast.success('Status atualizado', 'O status do chamado foi alterado com sucesso.');
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error('Erro ao atualizar', err.message || 'Não foi possível alterar o status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await client.deleteCard(card.id);
      toast.success('Chamado excluído', 'O chamado foi deletado com sucesso.');
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error('Erro ao excluir', err.message || 'Não foi possível deletar o chamado.');
    } finally {
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  };

  const handleCopyLink = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('card', card.id);
      navigator.clipboard.writeText(url.toString());
      setCopied(true);
      toast.success('Link copiado', 'O link do chamado foi copiado para a área de transferência.');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const hasStatusChanged = status !== card.status;
  const isBug = card.card_type === 'bug';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40 animate-fadeIn">
      <div className="bg-white rounded-xl max-w-xl w-full flex flex-col shadow-2xl border max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-start">
          <div className="min-w-0 flex-1 pr-6">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded ${
                isBug ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
              }`}>
                {isBug ? 'Bug Report' : 'Feature Request'}
              </span>
              {card.code && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium">
                  {card.code}
                </span>
              )}
              <SeverityBadge severity={card.card_metadata?.severity} />
              <StatusPill status={card.status} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 leading-snug">{card.title}</h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copiar link para o chamado"
              className="p-1.5 rounded-lg border text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {card.description ? (
            <div className="bg-slate-50 border rounded-lg p-4">
              <MarkdownRenderer content={card.description} />
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Sem descrição fornecida.</p>
          )}

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Criado {formatRelativeTime(card.created_at)}</span>
          </div>
        </div>

        {/* Footer / Status change */}
        <div className="p-5 border-t bg-slate-50/50 rounded-b-xl space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500">Alterar Status</label>
            <div className="flex gap-2">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={!hasStatusChanged || isUpdatingStatus}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors flex items-center gap-1.5"
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Status'
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                title="Excluir chamado"
                disabled={isDeleting}
                className="p-2 border rounded-lg border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Excluir chamado"
        description="Tem certeza que deseja excluir este chamado permanentemente? Esta ação não pode ser desfeita."
        confirmLabel="Sim, excluir"
        cancelLabel="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
