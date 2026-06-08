import React, { useState, useEffect } from 'react';
import { SnapsCard, SnapsPublicClient, SupportListResponse } from '../../api/snaps-client';
import { CardRow } from './CardRow';
import { CardDetailModal } from './CardDetailModal';
import { CreateCardModal } from './CreateCardModal';
import { SearchInput, Pagination, toast } from '../shared';
import { AlertCircle, Bug, Lightbulb, Loader2, Plus, RefreshCw } from 'lucide-react';

export interface SupportBoardProps {
  projectId: string;
  apiKey: string;
  apiUrl?: string;
  defaultTab?: 'active' | 'history';
  pageSize?: number;
  appName?: string;
}

export function SupportBoard({
  projectId,
  apiKey,
  apiUrl,
  defaultTab = 'active',
  pageSize = 10,
  appName,
}: SupportBoardProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>(defaultTab);

  // Pagination States
  const [activeData, setActiveData] = useState<SupportListResponse | null>(null);
  const [historyData, setHistoryData] = useState<SupportListResponse | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    severity: '',
  });

  // Modal States
  const [selectedCard, setSelectedCard] = useState<SnapsCard | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDefaultTab, setCreateDefaultTab] = useState<'bug' | 'feature'>('bug');

  const client = new SnapsPublicClient({ projectId, apiKey, apiUrl });

  // 1. Fetch function
  const fetchTickets = async (tab: 'active' | 'history') => {
    setIsLoading(true);
    setError(null);
    try {
      if (tab === 'active') {
        const data = await client.fetchSupportCards(
          undefined,
          pageSize,
          activePage * pageSize,
          'done' // exclude done
        );
        setActiveData(data);
      } else {
        const data = await client.fetchSupportCards(
          'done',
          pageSize,
          historyPage * pageSize
        );
        setHistoryData(data);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar chamados.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch on mount & tab/page changes
  useEffect(() => {
    fetchTickets(activeTab);
  }, [activeTab, activePage, historyPage]);

  // 3. Deep-link check on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cardId = params.get('card');
    if (cardId && !selectedCard) {
      client.fetchSingleCard(cardId)
        .then(card => setSelectedCard(card))
        .catch(err => console.warn('[SupportBoard] Deep-linked card not found:', err));
    }
  }, []);

  const handleCardClick = (card: SnapsCard) => {
    setSelectedCard(card);
    const url = new URL(window.location.href);
    url.searchParams.set('card', card.id);
    window.history.replaceState({}, '', url.toString());
  };

  const handleCloseDetail = () => {
    setSelectedCard(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('card');
    window.history.replaceState({}, '', url.toString());
  };

  const handleCreateSuccess = () => {
    fetchTickets(activeTab);
  };

  // 4. Processing cards (filtering and sorting)
  const currentData = activeTab === 'active' ? activeData : historyData;
  const items = currentData?.items || [];
  const totalItems = currentData?.total || 0;

  // Client-side filtering
  const filteredItems = items.filter(card => {
    const term = search.toLowerCase();
    const titleMatch = card.title.toLowerCase().includes(term);
    const codeMatch = card.code?.toLowerCase().includes(term) || false;
    
    const statusMatch = !filters.status || card.status === filters.status;
    const typeMatch = !filters.type || card.card_type === filters.type;
    const severityMatch = !filters.severity || card.card_metadata?.severity === filters.severity;

    return (titleMatch || codeMatch) && statusMatch && typeMatch && severityMatch;
  });

  // Client-side sorting
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedItems = [...filteredItems].sort((a, b) => {
    const sa = severityOrder[a.card_metadata?.severity || ''] ?? 4;
    const sb = severityOrder[b.card_metadata?.severity || ''] ?? 4;
    
    // Sort by priority first, then by date descending
    if (sa !== sb) return sa - sb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const currentPage = activeTab === 'active' ? activePage : historyPage;
  const handlePageChange = (newPage: number) => {
    if (activeTab === 'active') {
      setActivePage(newPage);
    } else {
      setHistoryPage(newPage);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl w-full mx-auto">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading && activeTab === 'active' ? 'animate-spin' : ''}`} />
            Chamados Ativos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading && activeTab === 'history' ? 'animate-spin' : ''}`} />
            Histórico
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCreateDefaultTab('bug');
              setIsCreateOpen(true);
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Bug className="w-4 h-4" />
            Novo Bug
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateDefaultTab('feature');
              setIsCreateOpen(true);
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Lightbulb className="w-4 h-4" />
            Sugerir Melhoria
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por título ou código..."
          />
        </div>

        <div>
          <select
            value={filters.type}
            onChange={e => setFilters({ ...filters, type: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Todos os tipos</option>
            <option value="bug">Bugs</option>
            <option value="feature">Sugestões</option>
          </select>
        </div>

        <div>
          <select
            value={filters.severity}
            onChange={e => setFilters({ ...filters, severity: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Todas as severidades</option>
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
        </div>
      </div>

      {/* Ticket List */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden min-h-[250px] flex flex-col justify-between">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            <span className="text-sm font-medium">Carregando chamados...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-red-500 gap-2">
            <AlertCircle className="w-8 h-8" />
            <span className="text-sm font-semibold">{error}</span>
            <button
              type="button"
              onClick={() => fetchTickets(activeTab)}
              className="mt-2 text-xs bg-red-50 border border-red-200 px-3 py-1 rounded text-red-700 hover:bg-red-100"
            >
              Tentar Novamente
            </button>
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 gap-2 text-center px-4">
            <Plus className="w-8 h-8 text-slate-300 stroke-[1.5]" />
            <span className="text-sm font-semibold text-slate-500">Nenhum chamado encontrado</span>
            <span className="text-xs text-slate-400 max-w-xs">
              Você pode reportar um problema ou sugerir melhorias clicando nos botões acima.
            </span>
          </div>
        ) : (
          <div className="divide-y">
            {sortedItems.map(card => (
              <CardRow
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !error && sortedItems.length > 0 && (
          <div className="p-4 border-t bg-slate-50/50">
            <Pagination
              page={currentPage}
              total={totalItems}
              limit={pageSize}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          projectId={projectId}
          apiKey={apiKey}
          apiUrl={apiUrl}
          onClose={handleCloseDetail}
          onRefresh={() => fetchTickets(activeTab)}
        />
      )}

      {/* Create Card Modal */}
      <CreateCardModal
        projectId={projectId}
        apiKey={apiKey}
        apiUrl={apiUrl}
        appName={appName}
        isOpen={isCreateOpen}
        defaultTab={createDefaultTab}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
