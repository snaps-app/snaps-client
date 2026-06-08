import React, { useState } from 'react';
import { BugReportForm } from '../BugReportForm';
import { FeatureRequestForm } from '../FeatureRequestForm';
import { X, Bug, Lightbulb } from 'lucide-react';

export interface CreateCardModalProps {
  projectId: string;
  apiKey: string;
  apiUrl?: string;
  appName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultTab?: 'bug' | 'feature';
}

export function CreateCardModal({
  projectId,
  apiKey,
  apiUrl,
  appName,
  isOpen,
  onClose,
  onSuccess,
  defaultTab = 'bug',
}: CreateCardModalProps) {
  const [activeTab, setActiveTab] = useState<'bug' | 'feature'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40 overflow-y-auto">
      <div className="bg-slate-50 rounded-xl max-w-2xl w-full flex flex-col shadow-2xl border my-8 relative">
        
        {/* Close button in header */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Custom Tabs */}
        <div className="flex border-b bg-white rounded-t-xl px-6 pt-4 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('bug')}
            className={`pb-3 text-sm font-bold flex items-center gap-1.5 transition-all border-b-2 px-1 ${
              activeTab === 'bug'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Bug className="w-4 h-4" />
            Reportar Bug
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('feature')}
            className={`pb-3 text-sm font-bold flex items-center gap-1.5 transition-all border-b-2 px-1 ${
              activeTab === 'feature'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            Sugerir Melhoria
          </button>
        </div>

        {/* Forms containers (removing duplicate shadows/borders) */}
        <div className="p-1 overflow-y-auto max-h-[80vh]">
          {activeTab === 'bug' ? (
            <div className="bg-transparent border-0 shadow-none p-0 flex justify-center">
              <BugReportForm
                projectId={projectId}
                apiKey={apiKey}
                apiUrl={apiUrl}
                appName={appName}
                onSuccess={() => {
                  onSuccess();
                  onClose();
                }}
                onCancel={onClose}
              />
            </div>
          ) : (
            <div className="bg-transparent border-0 shadow-none p-0 flex justify-center">
              <FeatureRequestForm
                projectId={projectId}
                apiKey={apiKey}
                apiUrl={apiUrl}
                appName={appName}
                onSuccess={() => {
                  onSuccess();
                  onClose();
                }}
                onCancel={onClose}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
