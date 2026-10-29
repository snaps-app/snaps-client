import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AttachmentResponse, ProposalEvent, recentContext, RecentMessage, SnapsCard, SnapsHttpError, SnapsPublicClient, SupportMessage, SupportSession } from '../../api/snaps-client';
import { MarkdownRenderer } from '../shared';
import { detectEnvironment } from '../BugReportForm/EnvironmentDetector';

export interface SupportChatProps { projectId: string; apiKey: string; apiUrl?: string; appName?: string; sessionUserRef?: string; sessionKey?: string; onCreated: (card: SnapsCard) => void; }
type Message = RecentMessage & { id: string; incomplete?: boolean; attachments?: AttachmentResponse[] };
type Upload = { id: string; file: File; response?: AttachmentResponse; error?: boolean; loading: boolean };
export function SupportChat(props: SupportChatProps) {
  return <ChatSession key={JSON.stringify([props.projectId, props.apiKey, props.apiUrl, props.sessionUserRef, props.sessionKey])} {...props} />;
}
function ChatSession({ projectId, apiKey, apiUrl, appName, sessionUserRef, onCreated }: SupportChatProps) {
  const client = useMemo(() => new SnapsPublicClient({ projectId, apiKey, apiUrl }), [projectId, apiKey, apiUrl]);
  const [entry, setEntry] = useState(0); const [ready, setReady] = useState(false); const [expired, setExpired] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]); const [text, setText] = useState('');
  const [uploads, setUploads] = useState<Upload[]>([]); const [proposal, setProposal] = useState<ProposalEvent | null>(null);
  const [created, setCreated] = useState<SnapsCard | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const session = useRef<SupportSession | null>(null); const active = useRef(false); const running = useRef(false);
  const stream = useRef<AbortController | null>(null); const uploadControllers = useRef(new Set<AbortController>());
  const pending = useRef<{ payload: SupportMessage; assistantId: string } | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const clear = () => { setMessages([]); setText(''); setUploads([]); setProposal(null); setCreated(null); pending.current = null; };
  const expire = () => {
    stream.current?.abort(); uploadControllers.current.forEach(c => c.abort());
    const old = session.current; session.current = null; if (old) void client.closeSupportSession(old).catch(() => {});
    clear(); setReady(false); setExpired(true); setBusy(false); running.current = false;
  };
  useEffect(() => {
    active.current = true; let live = true; let own: SupportSession | null = null;
    clear(); setReady(false); setExpired(false); setError(''); running.current = false; setBusy(false);
    void client.createSupportSession(sessionUserRef).then(value => {
      own = value;
      if (!live) { void client.closeSupportSession(value).catch(() => {}); return; }
      session.current = value; setLastActivity(Date.now()); setReady(true);
    }).catch(() => { if (live) setError('Suporte indisponível. Tente iniciar uma nova conversa.'); });
    const close = () => {
      stream.current?.abort(); uploadControllers.current.forEach(c => c.abort());
      if (own) { const old = own; own = null; void client.closeSupportSession(old).catch(() => {}); }
    };
    const leaving = () => { close(); clear(); session.current = null; setReady(false); setExpired(true); setBusy(false); running.current = false; };
    const returning = (event: PageTransitionEvent) => { if (event.persisted) setEntry(v => v + 1); };
    window.addEventListener('pagehide', leaving); window.addEventListener('pageshow', returning);
    return () => { live = false; active.current = false; session.current = null; pending.current = null; close(); window.removeEventListener('pagehide', leaving); window.removeEventListener('pageshow', returning); };
  }, [client, sessionUserRef, entry]);
  useEffect(() => {
    if (!ready || !session.current) return;
    const remaining = Math.min(new Date(session.current.expires_at).getTime() - Date.now(), 30 * 60 * 1000 - (Date.now() - lastActivity));
    const timer = setTimeout(expire, Math.max(0, remaining)); return () => clearTimeout(timer);
  }, [ready, lastActivity]);

  const upload = async (item: Upload) => {
    const controller = new AbortController(); uploadControllers.current.add(controller);
    setUploads(u => u.map(x => x.id === item.id ? { ...x, loading: true, error: false } : x));
    try {
      const response = await client.uploadAttachment(item.file, controller.signal);
      if (active.current && !controller.signal.aborted) setUploads(u => u.map(x => x.id === item.id ? { ...x, response, loading: false } : x));
    } catch { if (active.current && !controller.signal.aborted) setUploads(u => u.map(x => x.id === item.id ? { ...x, loading: false, error: true } : x)); }
    finally { uploadControllers.current.delete(controller); }
  };
  const chooseImages = (files: FileList | null) => {
    if (!files) return;
    if (uploads.length + files.length > 4 || Array.from(files).some(f => !['image/png', 'image/jpeg', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024 || f.size === 0)) {
      setError('Envie até 4 imagens PNG, JPEG ou WebP de até 5 MiB cada.'); return;
    }
    const next = Array.from(files).map(file => ({ id: crypto.randomUUID(), file, loading: true }));
    setError(''); setUploads(u => [...u, ...next]); next.forEach(item => { void upload(item); });
  };
  const run = async (request: { payload: SupportMessage; assistantId: string }) => {
    const current = session.current; if (!current || running.current) return;
    running.current = true; setBusy(true); setError(''); setProposal(null);
    const controller = new AbortController(); stream.current = controller; setLastActivity(Date.now());
    try {
      await client.sendSupportMessage(current, request.payload, event => {
        if (!active.current || controller.signal.aborted) return;
        if (event.type === 'token') setMessages(all => all.map(m => m.id === request.assistantId ? { ...m, content: m.content + event.content } : m));
        if (event.type === 'proposal') setProposal(event);
        if (event.type === 'error' || event.type === 'guardrail_tripped') setError(event.message);
        if (event.type === 'done') setMessages(all => all.map(m => m.id === request.assistantId ? { ...m, incomplete: event.incompleto } : m));
      }, controller.signal);
      if (!controller.signal.aborted) pending.current = null;
    } catch (e) {
      if (!active.current || session.current !== current) return;
      if (e instanceof SnapsHttpError && [401, 403, 410].includes(e.status)) { expire(); return; }
      setMessages(all => all.map(m => m.id === request.assistantId ? { ...m, incomplete: true } : m));
      setError(controller.signal.aborted ? 'Resposta cancelada. O texto parcial permanece apenas nesta conversa.' : 'Resposta interrompida. Você pode tentar o mesmo envio novamente.');
    } finally { if (active.current && session.current === current) { running.current = false; setBusy(false); stream.current = null; } }
  };
  const send = (e: React.FormEvent) => {
    e.preventDefault(); if (!text.trim() || !ready || running.current || uploads.some(u => !u.response)) return;
    const assistantId = crypto.randomUUID();
    const technical = messages.length ? '' : '\n\nDados do aplicativo (informados pelo navegador): ' + JSON.stringify({ application: appName || null, ...detectEnvironment() });
    const request = { assistantId, payload: { client_message_id: crypto.randomUUID(), text: text.trim().slice(0, 7000) + technical, context: recentContext(messages), attachment_ids: uploads.map(u => u.response!.attachment_id) } };
    pending.current = request;
    setMessages(m => [...m, { id: request.payload.client_message_id, role: 'user', content: text.trim(), attachments: uploads.map(u => u.response!) }, { id: assistantId, role: 'assistant', content: '' }]);
    setText(''); setUploads([]); void run(request);
  };
  const confirm = async () => {
    const current = session.current; if (!proposal || !current || running.current) return;
    running.current = true; setBusy(true); setError('');
    try {
      const card = await client.confirmSupportProposal(current, { hash: proposal.hash, version: proposal.version });
      if (active.current && session.current === current) { setCreated(card); setProposal(null); onCreated(card); }
    } catch (e) {
      if (!active.current || session.current !== current) return;
      if (e instanceof SnapsHttpError && [401, 403, 410].includes(e.status)) { expire(); return; }
      if (e instanceof SnapsHttpError && e.status === 409) { setProposal(null); setError('A proposta mudou. Envie uma mensagem para revisar antes de confirmar.'); }
      else setError('Não foi possível confirmar. Tente novamente; a confirmação não duplica o chamado.');
    } finally { if (active.current && session.current === current) { running.current = false; setBusy(false); } }
  };
  return <section aria-label="Chat de suporte" className="snaps-chat space-y-4 border rounded-xl p-4">
    <h2 className="text-lg font-bold">Converse com o suporte</h2>
    <p className="text-sm">Conte o que aconteceu ou sua ideia de melhoria. Vou reunir os dados do chamado e mostrar tudo para você revisar antes de enviar.</p>
    <p className="text-sm">Ao encerrar, esta conversa é apagada. O chamado confirmado permanece disponível na lista.</p>
    <div role="log" aria-label="Mensagens da conversa" aria-live="polite" className="space-y-3">{messages.map(m => <div key={m.id} className="rounded border p-3"><strong>{m.role === 'user' ? 'Você' : 'Suporte'}</strong><MarkdownRenderer content={m.content} />{m.attachments?.map(a => <img key={a.attachment_id} src={a.url} alt="Imagem enviada nesta conversa" className="max-w-full" width={200} />)}{m.incomplete && <span>Resposta incompleta</span>}</div>)}</div>
    {error && <p role="alert">{error}</p>}
    {expired && <p role="status">Conversa expirada. Inicie uma nova conversa para continuar.</p>}
    {!ready && !error && !expired && <p role="status">Iniciando conversa...</p>}
    {(expired || (!ready && error) || created) && <button type="button" className="snaps-button" onClick={() => setEntry(v => v + 1)}>Nova conversa</button>}
    {proposal && !created && <section aria-label="Proposta de chamado" className="border rounded p-4 space-y-3"><h3>{proposal.proposal.title}</h3><p>{proposal.proposal.card_type === 'bug' ? 'Relato de bug' : 'Sugestão de melhoria'}</p><TicketFields proposal={proposal} /><MarkdownRenderer content={proposal.proposal.description} /><p>Revise os campos. Para corrigir algum dado, envie uma mensagem antes de confirmar.</p><button type="button" className="snaps-button" disabled={busy} onClick={() => { void confirm(); }}>Confirmar criação</button></section>}
    {created && <p role="status">Chamado criado: {created.code || created.id} — {created.title}</p>}
    {ready && !created && <form onSubmit={send} className="space-y-3">
      <label className="block">Mensagem<textarea aria-label="Mensagem" maxLength={7000} value={text} onChange={e => setText(e.target.value)} rows={3} className="w-full border rounded p-2" /></label>
      <label className="block">Anexar imagens<input type="file" aria-label="Anexar imagens" multiple accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { chooseImages(e.target.files); e.target.value = ''; }} /></label>
      <p className="text-sm">Até 4 imagens de 5 MiB. As imagens anexadas usam URLs públicas de evidência.</p>
      <ul>{uploads.map(u => <li key={u.id} className="flex items-center gap-2"><ImagePreview file={u.file} /><span>{u.file.name} {u.loading ? 'Enviando...' : u.error ? 'Falha no upload' : 'Pronta'}</span>{u.error && <button type="button" className="snaps-button" onClick={() => { void upload(u); }}>Tentar upload novamente</button>}<button type="button" disabled={busy || u.loading} onClick={() => setUploads(all => all.filter(x => x.id !== u.id))}>Remover {u.file.name}</button></li>)}</ul>
      <div className="flex gap-2"><button type="submit" className="snaps-button" disabled={busy || uploads.some(u => !u.response)}>Enviar</button>
        {busy && <button type="button" className="snaps-button" onClick={() => { setProposal(null); pending.current = null; stream.current?.abort(); }}>Cancelar resposta</button>}
        {!busy && pending.current && <button type="button" className="snaps-button" onClick={() => { if (pending.current) void run(pending.current); }}>Tentar envio novamente</button>}
      </div>
    </form>}
  </section>;
}
function TicketFields({ proposal }: { proposal: ProposalEvent }) {
  const metadata = proposal.proposal.card_metadata;
  if (!metadata) return null;
  const labels: Record<string, string> = { application: 'Aplicação', module: 'Módulo / tela', actual_behavior: 'O que aconteceu', expected_behavior: 'O que deveria acontecer', steps_to_reproduce: 'Passos para reproduzir', severity: 'Severidade', frequency: 'Frequência', users_affected: 'Usuários afetados', blocks_critical_flow: 'Bloqueia fluxo crítico', has_workaround: 'Existe alternativa', workaround_description: 'Descrição da alternativa', problem_or_opportunity: 'Dor / oportunidade', proposed_solution: 'Solução proposta', expected_impact: 'Impacto esperado', priority_justification: 'Justificativa', browser: 'Navegador', os: 'Sistema operacional', screen_resolution: 'Resolução', app_version: 'Versão do app' };
  const values: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica', always: 'Sempre', sometimes: 'Às vezes', once: 'Uma vez', unknown: 'Não informado', single: 'Só comigo', few: 'Poucos', many: 'Muitos', all: 'Todos' };
  return <dl className="snaps-ticket-fields">{Object.entries(metadata).filter(([key]) => labels[key]).map(([key, value]) => <div key={key}><dt>{labels[key]}</dt><dd>{typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : values[String(value)] || String(value || 'Não informado')}</dd></div>)}</dl>;
}
function ImagePreview({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const value = URL.createObjectURL(file); setUrl(value); return () => URL.revokeObjectURL(value); }, [file]);
  return url ? <img src={url} alt={`Prévia de ${file.name}`} width={64} height={64} /> : null;
}
