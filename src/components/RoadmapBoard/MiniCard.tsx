import React from 'react';
import { SnapsCard } from '../../api/snaps-client';
import { TypeBadge, StatusPill } from '../shared';

export interface MiniCardProps {
  card: SnapsCard;
}

export function MiniCard({ card }: MiniCardProps) {
  return (
    <div className="bg-white p-3 rounded-lg border shadow-sm hover:shadow transition-shadow flex flex-col justify-between gap-3 h-full">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight">
            {card.title}
          </h4>
          {card.code && (
            <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-mono font-medium shrink-0">
              {card.code}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 flex-wrap">
        <TypeBadge type={card.card_type || 'bug'} />
        <StatusPill status={card.status} />
      </div>
    </div>
  );
}
