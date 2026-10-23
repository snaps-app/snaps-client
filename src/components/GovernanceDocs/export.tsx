import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function markdownFilename(name: string) {
  return (name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/^\.+|[. ]+$/g, '').slice(0, 120) || 'documento') + '.md';
}
export function downloadMarkdown(doc: { name: string; content: string }) {
  const url = URL.createObjectURL(new Blob([doc.content], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = markdownFilename(doc.name); document.body.append(anchor);
  try { anchor.click(); } finally { anchor.remove(); URL.revokeObjectURL(url); }
}
export const printStyles = `@page { size: A4; margin: 18mm; }
body { font: 11pt/1.5 system-ui, sans-serif; color: #111; margin: 0; overflow-wrap: anywhere; }
h1,h2,h3,h4 { break-after: avoid; } p,li { orphans: 3; widows: 3; }
img { max-width: 100%; height: auto; } pre { white-space: pre-wrap; } table { border-collapse: collapse; width: 100%; }
th,td { border: 1px solid #ccc; padding: 6px; } thead { display: table-header-group; } tr,img { break-inside: avoid; }
a { color: inherit; }`;
export function printHtml(doc: { name: string; content: string }) {
  return '<!doctype html>' + renderToStaticMarkup(<html lang="pt-BR"><head><meta charSet="utf-8" /><meta httpEquiv="Content-Security-Policy" content="default-src 'none'; img-src https: http:; style-src 'unsafe-inline'; script-src 'none'" /><title>{doc.name}</title><style>{printStyles}</style></head><body><article><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{doc.content}</ReactMarkdown></article></body></html>);
}
export async function printDocument(doc: { name: string; content: string }) {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Permita abrir a janela de impressão e tente novamente.');
  popup.opener = null;
  const url = URL.createObjectURL(new Blob([printHtml(doc)], { type: 'text/html;charset=utf-8' }));
  try {
    popup.location.replace(url); popup.focus();
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => { clearInterval(poll); clearTimeout(deadline); error ? reject(error) : resolve(); };
      const poll = setInterval(() => {
        if (popup.closed) { finish(new Error('Janela de impressão fechada.')); return; }
        if (popup.document.URL === url && popup.document.readyState === 'complete') finish();
      }, 50);
      const deadline = setTimeout(() => finish(new Error('Não foi possível carregar a impressão completa.')), 10000);
    });
    await Promise.all(Array.from(popup.document.images).map(img => img.decode()));
    popup.print();
  } finally { URL.revokeObjectURL(url); }
}

