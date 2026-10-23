import { AttachmentResponse, readSupportEvents, SupportEvent, SupportMessage, SupportSession } from './support-chat';
export * from './support-chat';

export interface SnapsPublicClientConfig {
  projectId: string;
  apiKey: string;
  apiUrl?: string;
}

export interface CardMetadata {
  browser?: string;
  os?: string;
  screen_resolution?: string;
  app_version?: string;
  severity?: string;
  frequency?: string;
  users_affected?: string;
  blocks_critical_flow?: boolean;
  has_workaround?: boolean;
  workaround_description?: string;
  attachment_urls?: string[];
  problem_or_opportunity?: string;
  proposed_solution?: string;
  expected_impact?: string;
  priority_justification?: string;
}

export interface SnapsCard {
  editable?: boolean;
  edit_reason?: string | null;
  id: string;
  code?: string;
  title: string;
  description?: string;
  card_type?: 'bug' | 'feature' | string;
  status: string;
  priority?: string;
  labels?: string[];
  card_metadata?: CardMetadata | any;
  created_at: string;
}

export interface SupportListResponse {
  items: SnapsCard[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface SnapsSprint {
  id: string;
  name: string;
  status: string;
  tag?: string;
  cards?: SnapsCard[];
}

export interface PublicRoadmapResponse {
  project_id: string;
  sprints: SnapsSprint[];
  backlog: SnapsCard[];
  total?: number;
  limit?: number;
  offset?: number;
  has_more?: boolean;
  backlog_total?: number;
  backlog_limit?: number;
  backlog_offset?: number;
  backlog_has_more?: boolean;
}

export type SprintStatus = 'planning' | 'active' | 'done' | 'cancelled';
export interface RoadmapOptions { limit?: number; offset?: number; sprintStatus?: SprintStatus[]; backlogLimit?: number; backlogOffset?: number; }

export interface PublicDocSummary {
  id: string;
  name: string;
  type: string;
  updated_at: string;
}

export interface PublicDocDetail extends PublicDocSummary {
  content: string;
}

export interface SupportCardEdit { title?: string; description?: string; card_metadata?: CardMetadata; }
export class SnapsHttpError extends Error {
  constructor(public readonly status: number) { super(`Não foi possível concluir a solicitação (HTTP ${status}).`); this.name = 'SnapsHttpError'; }
}

export class SnapsPublicClient {
  private projectId: string;
  private apiKey: string;
  private apiUrl: string;

  constructor(config: SnapsPublicClientConfig) {
    this.projectId = config.projectId;
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://snaps.antigravity.dev';
    // Remove trailing slash if present
    if (this.apiUrl.endsWith('/')) {
      this.apiUrl = this.apiUrl.slice(0, -1);
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  async updateSupportCard(cardId: string, payload: SupportCardEdit): Promise<SnapsCard> {
    const res = await fetch(`${this.apiUrl}/public/projects/${this.projectId}/support/cards/${encodeURIComponent(cardId)}`, { method: 'PATCH', headers: this.getHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) throw new SnapsHttpError(res.status);
    return res.json();
  }

  private async supportRequest(path: string, payload: unknown, session?: SupportSession, signal?: AbortSignal, keepalive = false) {
    const res = await fetch(`${this.apiUrl}/public/projects/${this.projectId}/support/chats${path}`, { method: 'POST', headers: { ...this.getHeaders(), ...(session ? { 'X-Support-Session': session.session_token } : {}) }, body: JSON.stringify(payload), signal, keepalive });
    if (!res.ok) throw new SnapsHttpError(res.status);
    return res;
  }
  async createSupportSession(sessionUserRef?: string): Promise<SupportSession> { return (await this.supportRequest('', { session_user_ref: sessionUserRef || null })).json(); }
  async closeSupportSession(session: SupportSession): Promise<void> { await this.supportRequest(`/${encodeURIComponent(session.chat_id)}/close`, {}, session, undefined, true); }
  async confirmSupportProposal(session: SupportSession, proposal: { hash: string; version: number }): Promise<SnapsCard> { return (await this.supportRequest(`/${encodeURIComponent(session.chat_id)}/confirm`, proposal, session)).json(); }
  async sendSupportMessage(session: SupportSession, payload: SupportMessage, receive: (event: SupportEvent) => void, signal?: AbortSignal): Promise<void> {
    const res = await this.supportRequest(`/${encodeURIComponent(session.chat_id)}/messages`, payload, session, signal);
    if (!res.headers.get('Content-Type')?.toLowerCase().includes('text/event-stream') || !res.body) throw new Error('Resposta de suporte inválida.');
    await readSupportEvents(res.body, receive);
  }

  async fetchSupportCards(
    status?: string,
    limit: number = 20,
    offset: number = 0,
    excludeStatus?: string
  ): Promise<SupportListResponse> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (excludeStatus) params.set('exclude_status', excludeStatus);
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());

    const url = `${this.apiUrl}/public/projects/${this.projectId}/support?${params.toString()}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      throw new Error(`SnapsPublicClient.fetchSupportCards: HTTP ${res.status}`);
    }
    return res.json();
  }

  async fetchSingleCard(cardId: string): Promise<SnapsCard> {
    const url = `${this.apiUrl}/public/projects/${this.projectId}/support/cards/${cardId}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      throw new Error(`SnapsPublicClient.fetchSingleCard: HTTP ${res.status}`);
    }
    return res.json();
  }

  async createSupportCard(payload: {
    title: string;
    description?: string;
    card_type?: string;
    priority?: string;
    labels?: string[];
    status?: string;
    card_metadata?: any;
  }): Promise<SnapsCard> {
    const url = `${this.apiUrl}/public/projects/${this.projectId}/cards`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`SnapsPublicClient.createSupportCard: HTTP ${res.status}`);
    }
    return res.json();
  }

  async updateCardStatus(cardId: string, status: string): Promise<SnapsCard> {
    const url = `${this.apiUrl}/public/projects/${this.projectId}/support/cards/${cardId}/status`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      throw new Error(`SnapsPublicClient.updateCardStatus: HTTP ${res.status}`);
    }
    return res.json();
  }

  async deleteCard(cardId: string): Promise<void> {
    const url = `${this.apiUrl}/public/projects/${this.projectId}/support/cards/${cardId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`SnapsPublicClient.deleteCard: HTTP ${res.status}`);
    }
  }

  async fetchRoadmapSprints(options?: RoadmapOptions, signal?: AbortSignal): Promise<PublicRoadmapResponse> {
    const params = new URLSearchParams();
    if (options) {
      for (const [key, value] of Object.entries({ limit: options.limit, offset: options.offset, backlog_limit: options.backlogLimit, backlog_offset: options.backlogOffset })) {
        if (value !== undefined) params.set(key, String(value));
      }
      options.sprintStatus?.forEach(status => params.append('sprint_status', status));
    }
    const url = `${this.apiUrl}/public/projects/${this.projectId}/roadmap${params.size ? `?${params}` : ''}`;
    const res = await fetch(url, { headers: this.getHeaders(), signal });
    if (!res.ok) {
      throw new Error(`SnapsPublicClient.fetchRoadmapSprints: HTTP ${res.status}`);
    }
    return res.json();
  }

  async uploadAttachment(file: File, signal?: AbortSignal): Promise<AttachmentResponse> {
    const url = `${this.apiUrl}/public/projects/${this.projectId}/support/upload`;
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
      },
      body: formData,
      signal,
    });
    if (!res.ok) {
      throw new SnapsHttpError(res.status);
    }
    return res.json();
  }

  async fetchDocs(): Promise<PublicDocSummary[]> {
    const url = `${this.apiUrl}/public/projects/${this.projectId}/docs`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      throw new Error(`SnapsPublicClient.fetchDocs: HTTP ${res.status}`);
    }
    return res.json();
  }

  async fetchDocDetail(docId: string): Promise<PublicDocDetail> {
    const url = `${this.apiUrl}/public/projects/${this.projectId}/docs/${docId}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      throw new Error(`SnapsPublicClient.fetchDocDetail: HTTP ${res.status}`);
    }
    return res.json();
  }
}
