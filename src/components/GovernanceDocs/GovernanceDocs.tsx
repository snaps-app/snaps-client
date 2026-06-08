import React, { useState, useEffect } from 'react';
import { SnapsPublicClient, PublicDocSummary, PublicDocDetail } from '../../api/snaps-client';
import { DocTypeBadge } from './DocTypeBadge';
import { DocViewer } from './DocViewer';
import { SearchInput } from '../shared';
import { AlertCircle, FileText, Loader2, RefreshCw } from 'lucide-react';
import { formatRelativeTime } from '../SupportBoard/CardRow';

export interface GovernanceDocsProps {
  projectId: string;
  apiKey: string;
  apiUrl?: string;
}

type ViewState =
  | { mode: 'list' }
  | { mode: 'detail'; docId: string; docName: string };

export function GovernanceDocs({
  projectId,
  apiKey,
  apiUrl,
}: GovernanceDocsProps) {
  const [view, setView] = useState<ViewState>({ mode: 'list' });
  
  // List data states
  const [docs, setDocs] = useState<PublicDocSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Detail data states
  const [activeDoc, setActiveDoc] = useState<PublicDocDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');

  const client = new SnapsPublicClient({ projectId, apiKey, apiUrl });

  // 1. Fetch doc list
  const fetchDocList = async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const list = await client.fetchDocs();
      setDocs(list || []);
    } catch (err: any) {
      setListError(err.message || 'Erro ao carregar os documentos.');
    } finally {
      setIsLoadingList(false);
    }
  };

  // 2. Fetch doc detail
  const fetchDocDetail = async (docId: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      const detail = await client.fetchDocDetail(docId);
      setActiveDoc(detail);
    } catch (err: any) {
      setDetailError(err.message || 'Erro ao carregar detalhes do documento.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Fetch list on mount
  useEffect(() => {
    fetchDocList();
  }, []);

  // Fetch detail when view changes to detail
  useEffect(() => {
    if (view.mode === 'detail') {
      fetchDocDetail(view.docId);
    } else {
      setActiveDoc(null);
    }
  }, [view]);

  // Filter list
  const filteredDocs = docs.filter(doc =>
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.type.toLowerCase().includes(search.toLowerCase())
  );

  // Render detail view
  if (view.mode === 'detail') {
    if (isLoadingDetail) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2 min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          <span className="text-sm font-medium">Carregando documento...</span>
        </div>
      );
    }

    if (detailError || !activeDoc) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-red-500 gap-2 border rounded-xl bg-white shadow-sm min-h-[300px]">
          <AlertCircle className="w-8 h-8" />
          <span className="text-sm font-semibold">{detailError || 'Documento não encontrado.'}</span>
          <button
            type="button"
            onClick={() => fetchDocDetail(view.docId)}
            className="mt-2 text-xs bg-red-50 border border-red-200 px-3 py-1 rounded text-red-700 hover:bg-red-100"
          >
            Tentar Novamente
          </button>
          <button
            type="button"
            onClick={() => setView({ mode: 'list' })}
            className="mt-1 text-xs text-slate-500 hover:underline"
          >
            Voltar para Lista
          </button>
        </div>
      );
    }

    return (
      <DocViewer
        doc={activeDoc}
        onBack={() => setView({ mode: 'list' })}
      />
    );
  }

  // Render list view
  return (
    <div className="space-y-6 max-w-4xl w-full mx-auto animate-fadeIn">
      {/* Search and refresh header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filtrar por nome ou tipo..."
          />
        </div>

        <button
          type="button"
          onClick={fetchDocList}
          disabled={isLoadingList}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5 self-end md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
          Recarregar
        </button>
      </div>

      {/* Docs Grid */}
      {isLoadingList ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2 min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          <span className="text-sm font-medium">Carregando lista de documentos...</span>
        </div>
      ) : listError ? (
        <div className="flex flex-col items-center justify-center py-16 text-red-500 gap-2 border rounded-xl bg-white shadow-sm min-h-[200px]">
          <AlertCircle className="w-8 h-8" />
          <span className="text-sm font-semibold">{listError}</span>
          <button
            type="button"
            onClick={fetchDocList}
            className="mt-2 text-xs bg-red-50 border border-red-200 px-3 py-1 rounded text-red-700 hover:bg-red-100"
          >
            Tentar Novamente
          </button>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2 border rounded-xl bg-white shadow-sm min-h-[200px] text-center px-4">
          <FileText className="w-8 h-8 text-slate-300" />
          <span className="text-sm font-semibold text-slate-500">Nenhum documento encontrado</span>
          {search && (
            <span className="text-xs text-slate-400">
              Nenhum documento atende aos termos de filtro digitados.
            </span>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              onClick={() => setView({ mode: 'detail', docId: doc.id, docName: doc.name })}
              className="bg-white p-5 rounded-xl border shadow-sm hover:shadow-md hover:border-slate-300 cursor-pointer transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <DocTypeBadge type={doc.type} />
                </div>
                <h3 className="text-sm md:text-base font-bold text-slate-800 leading-snug line-clamp-2">
                  {doc.name}
                </h3>
              </div>
              
              <span className="text-[10px] text-slate-400 self-end">
                Atualizado {formatRelativeTime(doc.updated_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
