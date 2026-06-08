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
}

export interface PublicDocSummary {
  id: string;
  name: string;
  type: string;
  updated_at: string;
}

export interface PublicDocDetail extends PublicDocSummary {
  content: string;
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

  async fetchRoadmapSprints(): Promise<PublicRoadmapResponse> {
    const url = `${this.apiUrl}/public/projects/${this.projectId}/roadmap`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      throw new Error(`SnapsPublicClient.fetchRoadmapSprints: HTTP ${res.status}`);
    }
    return res.json();
  }

  async uploadAttachment(file: File): Promise<{ url: string }> {
    const url = `${this.apiUrl}/public/projects/${this.projectId}/support/upload`;
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
      },
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`SnapsPublicClient.uploadAttachment: HTTP ${res.status}`);
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
