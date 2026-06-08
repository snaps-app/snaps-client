import React, { useState, useEffect } from 'react';
import { SnapsPublicClient, SnapsSprint, SnapsCard } from '../../api/snaps-client';
import { SprintSection } from './SprintSection';
import { AlertCircle, Loader2 } from 'lucide-react';

export interface RoadmapBoardProps {
  projectId: string;
  apiKey: string;
  apiUrl?: string;
  showBacklog?: boolean;
}

export function RoadmapBoard({
  projectId,
  apiKey,
  apiUrl,
  showBacklog = true,
}: RoadmapBoardProps) {
  const [sprints, setSprints] = useState<SnapsSprint[]>([]);
  const [backlog, setBacklog] = useState<SnapsCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = new SnapsPublicClient({ projectId, apiKey, apiUrl });

  const fetchRoadmap = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.fetchRoadmapSprints();
      setSprints(data.sprints || []);
      setBacklog(data.backlog || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar o roadmap.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        <span className="text-sm font-medium">Carregando roadmap...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-red-500 gap-2 border rounded-xl bg-white shadow-sm min-h-[300px]">
        <AlertCircle className="w-8 h-8" />
        <span className="text-sm font-semibold">{error}</span>
        <button
          type="button"
          onClick={fetchRoadmap}
          className="mt-2 text-xs bg-red-50 border border-red-200 px-3 py-1 rounded text-red-700 hover:bg-red-100"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const hasNoContent = sprints.length === 0 && (!showBacklog || backlog.length === 0);

  if (hasNoContent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2 border rounded-xl bg-white shadow-sm min-h-[300px] text-center px-4">
        <AlertCircle className="w-8 h-8 text-slate-300" />
        <span className="text-sm font-semibold text-slate-500">Nenhum item no roadmap</span>
        <span className="text-xs text-slate-400 max-w-xs">
          Não há sprints cadastradas ou atividades no backlog público deste projeto.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl w-full mx-auto">
      {/* Sprints list */}
      {sprints.map(sprint => (
        <SprintSection
          key={sprint.id}
          sprintName={sprint.name}
          sprintStatus={sprint.status}
          tag={sprint.tag}
          cards={sprint.cards || []}
          defaultExpanded={sprint.status.toLowerCase() === 'active'}
        />
      ))}

      {/* Backlog Section */}
      {showBacklog && backlog.length > 0 && (
        <SprintSection
          sprintName="Backlog de Pendências"
          sprintStatus="backlog"
          tag="Backlog"
          cards={backlog}
          defaultExpanded={sprints.length === 0} // Expand if there are no sprints
        />
      )}
    </div>
  );
}
