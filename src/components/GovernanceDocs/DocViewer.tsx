import React from 'react';
import { DocTypeBadge } from './DocTypeBadge';
import { MarkdownRenderer } from '../shared';
import { ArrowLeft, Calendar } from 'lucide-react';
import { formatRelativeTime } from '../SupportBoard/CardRow';

export interface DocViewerProps {
  doc: {
    id: string;
    name: string;
    type: string;
    content: string;
    updated_at: string;
  };
  onBack: () => void;
}

export function DocViewer({ doc, onBack }: DocViewerProps) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors w-max"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Lista
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Documentação</span>
          <span>&gt;</span>
          <span className="text-slate-600 font-medium">{doc.name}</span>
        </div>
      </div>

      {/* Doc Title & Info */}
      <div className="border-b pb-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <DocTypeBadge type={doc.type} />
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            Atualizado {formatRelativeTime(doc.updated_at)}
          </span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">
          {doc.name}
        </h2>
      </div>

      {/* Content Renderer */}
      <div className="bg-slate-50/50 border rounded-lg p-5">
        <MarkdownRenderer content={doc.content} />
      </div>
    </div>
  );
}
