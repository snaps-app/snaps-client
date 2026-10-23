import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function markdownFilename(name: string) {
  return (name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/^\.+|[. ]+$/g, '').slice(0, 120) || 'documento') + '.md';
}
export function downloadMarkdown(doc: { name: string; content: string }) {
  const url = URL.createObjectURL(new Blob([doc.content], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = markdownFilename(doc.name);
  document.body.append(anchor);
  try { anchor.click(); } finally { anchor.remove(); URL.revokeObjectURL(url); }
}
export const printStyles = `@page { size: A4; margin: 18mm; }
body { font: 11pt/1.5 system-ui, sans-serif; color: #111; margin: 0; overflow-wrap: anywhere; }
h1,h2,h3,h4 { break-after: avoid; } p,li { orphans: 3; widows: 3; }
img { max-width: 100%; height: auto; } pre { white-space: pre-wrap; } table { border-collapse: collapse; width: 100%; }
th,td { border: 1px solid #ccc; padding: 6px; } thead { display: table-header-group; } tr,img { break-inside: avoid; }
a { color: inherit; }`;
export async function printDocument(doc: { name: string; content: string }) {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Permita abrir a janela de impressão e tente novamente.');
  // Blank, same-origin document only; sever opener before placing any content.
  popup.opener = null;
  const target = popup.document;
  target.open(); target.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body></body></html>'); target.close();
  target.title = doc.name;
  const csp = target.createElement('meta'); csp.httpEquiv = 'Content-Security-Policy'; csp.content = "default-src 'none'; img-src https: http:; style-src 'unsafe-inline'; script-src 'none'"; target.head.append(csp);
  const style = target.createElement('style'); style.textContent = printStyles; target.head.append(style);
  const article = target.createElement('article');
  article.innerHTML = renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{doc.content}</ReactMarkdown>);
  target.body.append(article);
  await Promise.all(Array.from(target.images).map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); setTimeout(resolve, 5000); })));
  popup.focus(); popup.print();
}
