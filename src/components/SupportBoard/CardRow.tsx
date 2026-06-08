import React from 'react';
import { SnapsCard } from '../../api/snaps-client';
import { SeverityBadge, TypeBadge, StatusPill } from '../shared';

export interface CardRowProps {
  card: SnapsCard;
  onClick: () => void;
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `Há ${diffMins} min`;
  if (diffHours < 24) return `Há ${diffHours} h`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CardRow({ card, onClick }: CardRowProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer border-b last:border-b-0"
    >
      <div className="flex items-center gap-3 min-w-0 mr-4">
        <div className="shrink-0">
          <TypeBadge type={card.card_type || 'bug'} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-800 truncate">{card.title}</h4>
            {card.code && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono font-medium shrink-0">
                {card.code}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">
            Criado {formatRelativeTime(card.created_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <SeverityBadge severity={card.card_metadata?.severity} />
        <StatusPill status={card.status} />
      </div>
    </div>
  );
}
