import React from 'react';
import { Bug, Lightbulb, UploadCloud, Paperclip, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// === SeverityBadge ===
export interface SeverityBadgeProps {
  severity?: string;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const sev = (severity || 'medium').toLowerCase();
  let colorClass = 'border-slate-300 text-slate-600 bg-slate-50';
  let label = 'Média';

  if (sev === 'critical') {
    colorClass = 'border-red-500 text-red-700 bg-red-50';
    label = 'Crítico';
  } else if (sev === 'high') {
    colorClass = 'border-orange-400 text-orange-700 bg-orange-50';
    label = 'Alta';
  } else if (sev === 'low') {
    colorClass = 'border-slate-300 text-slate-500 bg-slate-100';
    label = 'Baixa';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${colorClass}`}>
      {label}
    </span>
  );
}

// === StatusPill ===
export interface StatusPillProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  'new-issues': { label: 'Novo', className: 'bg-red-500 text-white' },
  todo: { label: 'A Fazer', className: 'bg-slate-500 text-white' },
  in_progress: { label: 'Em Progresso', className: 'bg-blue-500 text-white' },
  review: { label: 'Em Review', className: 'bg-purple-500 text-white' },
  assurance: { label: 'Em Validação', className: 'bg-yellow-500 text-black' },
  done: { label: 'Concluído', className: 'bg-green-600 text-white' },
  backlog: { label: 'Backlog', className: 'bg-slate-400 text-white' },
};

export function StatusPill({ status }: StatusPillProps) {
  const cfg = STATUS_CONFIG[status] || { label: status, className: 'bg-slate-500 text-white' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// === TypeBadge ===
export interface TypeBadgeProps {
  type: string;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const isBug = type === 'bug';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
      isBug ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
    }`}>
      {isBug ? <Bug className="w-3.5 h-3.5" /> : <Lightbulb className="w-3.5 h-3.5" />}
      {isBug ? 'Bug' : 'Sugestão'}
    </span>
  );
}

// === MarkdownRenderer ===
export interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none 
      prose-p:leading-snug 
      prose-headings:text-sm prose-headings:font-semibold prose-headings:mb-1 
      prose-a:text-blue-500 hover:prose-a:text-blue-600 
      prose-img:rounded-md prose-img:border prose-img:max-h-64 prose-img:w-auto prose-img:object-contain
      max-h-[40vh] overflow-y-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// === Pagination ===
export interface PaginationProps {
  page: number; // 0-based
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-xs text-slate-500">
        Mostrando {page * limit + 1} - {Math.min((page + 1) * limit, total)} de {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className="px-2 py-1 text-xs border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        <span className="text-xs text-slate-600 font-semibold">{page + 1} / {totalPages}</span>
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          className="px-2 py-1 text-xs border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}

// === SearchInput ===
export interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Buscar..."}
        className="w-full px-3 py-1.5 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}

// === ConfirmDialog ===
export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border">
        <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{description}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium border rounded hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// === FileUploadZone ===
export interface FileUploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export function FileUploadZone({ files, onFilesChange }: FileUploadZoneProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      onFilesChange([...files, ...newFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      onFilesChange([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const updated = [...files];
    updated.splice(index, 1);
    onFilesChange(updated);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative"
      >
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-1.5 text-slate-500">
          <UploadCloud className="w-8 h-8 text-slate-400" />
          <span className="text-xs font-medium">Arraste e solte arquivos aqui, ou clique para fazer upload</span>
          <span className="text-[10px] text-slate-400">Suporta imagens, PDFs, vídeos ou logs</span>
        </div>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, idx) => {
            const isImg = file.type.startsWith('image/');
            const previewUrl = isImg ? URL.createObjectURL(file) : null;

            return (
              <div key={idx} className="relative group border rounded p-1.5 flex items-center gap-2 bg-slate-50 max-w-xs pr-8">
                {isImg && previewUrl ? (
                  <img src={previewUrl} alt={file.name} className="w-8 h-8 rounded object-cover border" />
                ) : (
                  <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-medium truncate text-slate-700">{file.name}</p>
                  <p className="text-[9px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute right-1 top-1 p-0.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// === Toast ===
type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

let toastListeners: Array<(toasts: ToastMessage[]) => void> = [];
let activeToasts: ToastMessage[] = [];

export const toast = {
  success: (title: string, description?: string) => showToast('success', title, description),
  error: (title: string, description?: string) => showToast('error', title, description),
  info: (title: string, description?: string) => showToast('info', title, description),
};

function showToast(type: ToastType, title: string, description?: string) {
  const id = Math.random().toString();
  const newToast = { id, type, title, description };
  activeToasts = [...activeToasts, newToast];
  toastListeners.forEach(listener => listener(activeToasts));

  setTimeout(() => {
    activeToasts = activeToasts.filter(t => t.id !== id);
    toastListeners.forEach(listener => listener(activeToasts));
  }, 4000);
}

export function useToasts() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>(activeToasts);
  React.useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter(l => l !== setToasts);
    };
  }, []);
  return toasts;
}

export function ToastContainer() {
  const toasts = useToasts();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`p-3 rounded-md shadow-md pointer-events-auto border flex flex-col gap-1 transition-all duration-300 ${
            t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="font-semibold text-sm">{t.title}</div>
          {t.description && <div className="text-xs opacity-90">{t.description}</div>}
        </div>
      ))}
    </div>
  );
}
