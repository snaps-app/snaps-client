import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { SupportChat, SupportChatProps } from './SupportChat';

export function FloatingSupport(props: SupportChatProps) {
  const [open, setOpen] = useState(false);
  const readSize = () => {
    try { return window.localStorage.getItem('snaps-support-expanded') === 'true'; } catch { return false; }
  };
  const [expanded, setExpanded] = useState(readSize);
  const toggleSize = () => {
    const next = !expanded;
    try { window.localStorage.setItem('snaps-support-expanded', String(next)); } catch { /* Storage is optional. */ }
    setExpanded(next);
  };
  const panel = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const processing = useRef(false);
  const [confirmClose, setConfirmClose] = useState(false);
  useEffect(() => {
    if (open && !confirmClose) panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [open, confirmClose]);
  const close = () => { setConfirmClose(false); setOpen(false); processing.current = false; launcher.current?.focus(); };
  const requestClose = () => { if (processing.current) setConfirmClose(true); else close(); };
  return <>
    {open && <div ref={panel} role="dialog" aria-modal="true" aria-label="Suporte Snaps" className={`snaps-support-panel${expanded ? ' snaps-support-panel-expanded' : ''}`} onKeyDown={e => {
      if (e.key === 'Escape') { e.preventDefault(); requestClose(); }
      if (e.key === 'Tab') {
        const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), input:not(:disabled), a[href], select')).filter(el => el.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && e.target === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && e.target === last) { e.preventDefault(); first?.focus(); }
      }
    }}>
      <header className="snaps-support-header"><span>Suporte Snaps</span><div className="snaps-support-actions"><button type="button" aria-label={expanded ? 'Restaurar' : 'Ampliar'} title={expanded ? 'Restaurar' : 'Ampliar'} aria-pressed={expanded} onClick={toggleSize}>{expanded ? <Minimize2 size={20} aria-hidden="true" /> : <Maximize2 size={20} aria-hidden="true" />}<span>{expanded ? 'Restaurar' : 'Ampliar'}</span></button><button type="button" aria-label="Encerrar conversa" onClick={requestClose}><X size={20} aria-hidden="true" /></button></div></header>
      {confirmClose && <section role="alertdialog" aria-modal="true" aria-label="Cancelar e fechar a conversa?" className="rounded border p-4 space-y-3">
        <p>Há uma operação em andamento. Ao fechar, ela será cancelada e a conversa será apagada.</p>
        <button autoFocus type="button" className="snaps-button" onClick={() => setConfirmClose(false)}>Continuar conversa</button>
        <button type="button" className="snaps-button" onClick={close}>Cancelar e fechar</button>
      </section>}
      <div className="snaps-support-body" hidden={confirmClose}><SupportChat {...props} onProcessingChange={value => { processing.current = value; props.onProcessingChange?.(value); }} /></div>
    </div>}
    <button ref={launcher} type="button" className="snaps-support-launcher" aria-label={open ? 'Encerrar conversa de suporte' : 'Abrir suporte Snaps'} aria-haspopup="dialog" aria-expanded={open} onClick={() => open ? requestClose() : (setExpanded(readSize()), setOpen(true))}>
      {open ? <X size={25} aria-hidden="true" /> : <svg viewBox="0 0 24 32" width="24" height="32" aria-hidden="true"><path fill="currentColor" d="M15.5 1 2 18h8L7.5 31 22 12h-8z" /></svg>}
    </button>
  </>;
}
