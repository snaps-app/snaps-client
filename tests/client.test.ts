import { describe, it, expect, vi } from 'vitest';
import { SnapsPublicClient } from '../src/api/snaps-client';

describe('public client baseline', () => {
  it('sends the key in headers and preserves the legacy roadmap URL', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sprints: [], backlog: [] })));
    vi.stubGlobal('fetch', fetcher);
    await new SnapsPublicClient({ projectId: 'p', apiKey: 'test-key', apiUrl: 'https://example.test/' }).fetchRoadmapSprints();
    expect(fetcher).toHaveBeenCalledWith('https://example.test/public/projects/p/roadmap', expect.objectContaining({ headers: expect.objectContaining({ 'X-API-Key': 'test-key' }) }));
  });
  it('rejects an unsuccessful public request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));
    await expect(new SnapsPublicClient({ projectId: 'p', apiKey: 'test-key' }).fetchDocs()).rejects.toThrow('403');
  });
});
