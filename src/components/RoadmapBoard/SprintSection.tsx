import React, { useState } from 'react';
import { SnapsCard } from '../../api/snaps-client';
import { MiniCard } from './MiniCard';
import { ProgressBar } from './ProgressBar';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface SprintSectionProps {
  sprintName: string;
  sprintStatus: string;
  tag?: string;
  cards: SnapsCard[];
  defaultExpanded?: boolean;
}

const SPRINT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Ativa', className: 'bg-green-600 text-white' },
  planning: { label: 'Planejamento', className: 'bg-blue-500 text-white' },
  done: { label: 'Concluída', className: 'bg-slate-500 text-white' },
  backlog: { label: 'Backlog', className: 'bg-slate-400 text-white' },
};

export function SprintSection({
  sprintName,
  sprintStatus,
  tag,
  cards,
  defaultExpanded = false,
}: SprintSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const totalCards = cards.length;
  const doneCards = cards.filter(c => c.status === 'done').length;
  const progress = totalCards > 0 ? (doneCards / totalCards) * 100 : 0;

  const statusCfg = SPRINT_STATUS_CONFIG[sprintStatus.toLowerCase()] || {
    label: sprintStatus,
    className: 'bg-slate-500 text-white',
  };

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden transition-all">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 select-none transition-colors border-b last:border-b-0"
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm md:text-base font-bold text-slate-800">{sprintName}</h3>
            {tag && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium">
                {tag}
              </span>
            )}
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
          </div>

          <div className="max-w-xs pt-1">
            <ProgressBar progress={progress} />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <span className="text-xs text-slate-400">
            {doneCards} / {totalCards} cards concluídos
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Content grid */}
      {isExpanded && (
        <div className="p-4 bg-slate-50/50 border-t">
          {cards.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">Nenhum card nesta sprint.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {cards.map(card => (
                <div key={card.id}>
                  <MiniCard card={card} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
