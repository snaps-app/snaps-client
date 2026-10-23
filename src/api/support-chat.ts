export interface SupportSession { chat_id: string; session_token: string; expires_at: string; }
export interface RecentMessage { role: 'user' | 'assistant'; content: string; }
export interface SupportMessage { client_message_id: string; text: string; context: RecentMessage[]; attachment_ids: string[]; }
export interface SupportProposal { title: string; description: string; card_type: 'bug' | 'improvement'; attachment_ids: string[]; }
export type ProposalEvent = { type: 'proposal'; proposal: SupportProposal; hash: string; version: number };
export type SupportEvent = { type: 'token'; content: string } | { type: 'done'; incompleto: boolean } | { type: 'error'; message: string } | { type: 'guardrail_tripped'; message: string } | ProposalEvent;
export interface AttachmentResponse { url: string; attachment_id: string; mime_type: string; size_bytes: number; }

export function recentContext(messages: RecentMessage[]): RecentMessage[] {
  let remaining = 16000; const result: RecentMessage[] = [];
  for (const message of messages.slice(-12).reverse()) {
    if ((message.role !== 'user' && message.role !== 'assistant') || !remaining) continue;
    const content = message.content.slice(-Math.min(4000, remaining)); remaining -= content.length;
    result.unshift({ role: message.role, content });
  }
  return result;
}
function publicEvent(value: unknown): SupportEvent | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.type === 'token' && typeof v.content === 'string') return { type: 'token', content: v.content };
  if (v.type === 'done') return { type: 'done', incompleto: Boolean(v.incompleto) };
  if (v.type === 'error') return { type: 'error', message: 'Não foi possível concluir. Tente novamente.' };
  if (v.type === 'guardrail_tripped') return { type: 'guardrail_tripped', message: 'Limite da resposta atingido.' };
  if (v.type === 'proposal' && typeof v.hash === 'string' && /^[a-f0-9]{64}$/.test(v.hash) && Number.isInteger(v.version) && Number(v.version) > 0 && v.proposal && typeof v.proposal === 'object') {
    const p = v.proposal as Record<string, unknown>;
    if (typeof p.title === 'string' && typeof p.description === 'string' && (p.card_type === 'bug' || p.card_type === 'improvement') && Array.isArray(p.attachment_ids) && p.attachment_ids.every(x => typeof x === 'string')) {
      return { type: 'proposal', hash: v.hash, version: Number(v.version), proposal: { title: p.title, description: p.description, card_type: p.card_type, attachment_ids: p.attachment_ids as string[] } };
    }
  }
  return null;
}
export async function readSupportEvents(stream: ReadableStream<Uint8Array>, receive: (event: SupportEvent) => void) {
  const reader = stream.getReader(); const decoder = new TextDecoder(); let buffer = ''; let doneSeen = false;
  const frame = (text: string) => {
    const data = text.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
    if (!data) return;
    let parsed: unknown; try { parsed = JSON.parse(data); } catch { throw new Error('Resposta de suporte inválida.'); }
    const event = publicEvent(parsed); if (event) { receive(event); if (event.type === 'done') doneSeen = true; }
  };
  try {
    while (true) {
      const { value, done } = await reader.read(); buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (buffer.length > 200000) throw new Error('Resposta de suporte inválida.');
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) { frame(buffer.slice(0, boundary.index)); buffer = buffer.slice(boundary.index + boundary[0].length); }
      if (done) break;
    }
    if (buffer.trim()) frame(buffer);
    if (!doneSeen) throw new Error('Resposta interrompida. O texto parcial foi mantido nesta sessão.');
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
