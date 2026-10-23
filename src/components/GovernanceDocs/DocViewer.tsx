import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PublicDocDetail } from '../../api/snaps-client';
import { DocTypeBadge } from './DocTypeBadge';
import { downloadMarkdown, printDocument } from './export';

export interface DocViewerProps { doc: PublicDocDetail; onBack: () => void; }
export function DocViewer({ doc, onBack }: DocViewerProps) {
  const [focused, setFocused] = useState(false); const [error, setError] = useState('');
  const expand = useRef<HTMLButtonElement>(null); const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!focused) return;
    close.current?.focus();
    return () => { expand.current?.focus(); };
  }, [focused]);
  const trap = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); setFocused(false); }
    if (focused && e.key === 'Tab') {
      const nodes = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [tabindex="0"]') || []).filter(x => !x.hasAttribute('disabled'));
      const root = dialog.current?.getRootNode() as Document | ShadowRoot;
      const index = nodes.indexOf(root.activeElement as HTMLElement);
      if ((e.shiftKey && index <= 0) || (!e.shiftKey && (index === nodes.length - 1 || index === -1))) { e.preventDefault(); nodes[e.shiftKey ? nodes.length - 1 : 0]?.focus(); }
    }
  };
  return <div ref={dialog} role={focused ? 'dialog' : undefined} aria-modal={focused || undefined} aria-label={focused ? doc.name : undefined}
    onKeyDown={trap} className={focused ? 'snaps-doc-focus' : 'w-full min-h-full bg-white rounded-xl border p-6 space-y-6'}>
    <div className="flex flex-wrap items-center gap-2">
      {!focused && <button type="button" className="snaps-button" onClick={onBack}>Voltar para Lista</button>}
      <button ref={expand} type="button" className="snaps-button" onClick={() => setFocused(true)} hidden={focused}>Ampliar</button>
      {focused && <button ref={close} type="button" className="snaps-button" onClick={() => setFocused(false)}>Fechar foco</button>}
      <button type="button" className="snaps-button" onClick={() => downloadMarkdown(doc)}>Baixar MD</button>
      <button type="button" className="snaps-button" onClick={() => { setError(''); void printDocument(doc).catch(() => setError('Não foi possível abrir a impressão. Permita a janela e tente novamente.')); }}>Imprimir / PDF</button>
    </div>
    {error && <p role="alert">{error}</p>}
    <header className="border-b py-4"><DocTypeBadge type={doc.type} /><h2 className="text-2xl font-bold mt-2">{doc.name}</h2></header>
    <article className="prose max-w-none w-full"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{doc.content}</ReactMarkdown></article>
  </div>;
}

