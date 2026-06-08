import React from 'react';

export interface DocTypeBadgeProps {
  type: string;
}

const typeColors: Record<string, string> = {
  prd: 'bg-blue-50 text-blue-700 border-blue-200',
  prd_novo_app: 'bg-blue-50 text-blue-700 border-blue-200',
  prd_novo_admin: 'bg-blue-50 text-blue-700 border-blue-200',
  roadmap: 'bg-green-50 text-green-700 border-green-200',
  playbook: 'bg-purple-50 text-purple-700 border-purple-200',
  strategy: 'bg-amber-50 text-amber-700 border-amber-200',
  architecture: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  context: 'bg-slate-50 text-slate-700 border-slate-200',
  other: 'bg-slate-50 text-slate-700 border-slate-200',
};

export function DocTypeBadge({ type }: DocTypeBadgeProps) {
  const normType = type.toLowerCase();
  const colorClass = typeColors[normType] || typeColors['other'];
  
  // Pretty format label
  let label = type.toUpperCase();
  if (normType === 'prd') label = 'PRD';
  if (normType === 'playbook') label = 'Playbook';
  if (normType === 'roadmap') label = 'Roadmap';
  if (normType === 'strategy') label = 'Estratégia';
  if (normType === 'architecture') label = 'Arquitetura';
  if (normType === 'context') label = 'Contexto';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${colorClass}`}>
      {label}
    </span>
  );
}
