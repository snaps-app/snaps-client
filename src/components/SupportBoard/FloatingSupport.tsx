import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { SupportChat, SupportChatProps } from './SupportChat';

export function FloatingSupport(props: SupportChatProps) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [open]);
  const close = () => { setOpen(false); launcher.current?.focus(); };
  return <>
    {open && <div ref={panel} role="dialog" aria-modal="true" aria-label="Suporte Snaps" className="snaps-support-panel" onKeyDown={e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, input:not(:disabled), a[href], select')).filter(el => el.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && e.target === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && e.target === last) { e.preventDefault(); first?.focus(); }
      }
    }}>
      <header className="snaps-support-header"><span>Suporte Snaps</span><button type="button" aria-label="Encerrar conversa" onClick={close}><X size={20} aria-hidden="true" /></button></header>
      <div className="snaps-support-body"><SupportChat {...props} /></div>
    </div>}
    <button ref={launcher} type="button" className="snaps-support-launcher" aria-label={open ? 'Encerrar conversa de suporte' : 'Abrir suporte Snaps'} aria-haspopup="dialog" aria-expanded={open} onClick={() => open ? close() : setOpen(true)}>
      {open ? <X size={25} aria-hidden="true" /> : <svg viewBox="0 0 24 32" width="24" height="32" aria-hidden="true"><path fill="currentColor" d="M15.5 1 2 18h8L7.5 31 22 12h-8z" /></svg>}
    </button>
  </>;
}
