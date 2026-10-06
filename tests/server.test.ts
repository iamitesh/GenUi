import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, it, vi } from 'vitest';
import { createGeminiHandler } from '../server/gemini';
import { scenarioMessages, initialData } from '../src/examples/scenarios';

async function withServer(env: Record<string, string>, fetcher: typeof fetch, run: (url: string) => Promise<void>) {
  const handler = createGeminiHandler(env, fetcher);
  const server = createServer((req, res) => { void handler(req, res); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
const request = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'Find equipment', data: initialData() }) };

it('returns an actionable error without a key and makes no provider call', async () => {
  const mock = vi.fn();
  await withServer({}, mock as typeof fetch, async url => {
    const response = await fetch(url, request);
    expect(response.status).toBe(503); expect(await response.text()).toContain('GEMINI_API_KEY'); expect(mock).not.toHaveBeenCalled();
  });
});
it('keeps the credential on the server and emits validated NDJSON', async () => {
  const messages = scenarioMessages('discover');
  const mock = vi.fn().mockResolvedValue(Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(messages) }] } }] }));
  await withServer({ GEMINI_API_KEY: 'test-key-not-a-real-secret' }, mock as typeof fetch, async url => {
    const response = await fetch(url, request);
    expect(response.status).toBe(200); expect(response.headers.get('content-type')).toBe('application/x-ndjson');
    const body = await response.text(); expect(body).not.toContain('test-key');
    expect(body.trim().split('\n').map(line => JSON.parse(line))).toEqual(messages);
    expect(mock.mock.calls[0][1].headers['x-goog-api-key']).toBe('test-key-not-a-real-secret');
  });
});
it('rejects malformed model output before sending any UI messages', async () => {
  const mock = vi.fn().mockResolvedValue(Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '[{"script":"bad"}]' }] } }] }));
  await withServer({ GEMINI_API_KEY: 'test-key' }, mock as typeof fetch, async url => {
    const response = await fetch(url, request);
    expect(response.status).toBe(502); expect(await response.text()).toContain('did not pass validation');
  });
});
it('rejects cross-origin requests before invoking the model', async () => {
  const mock = vi.fn();
  await withServer({ GEMINI_API_KEY: 'test-key' }, mock as typeof fetch, async url => {
    const response = await fetch(url, { ...request, headers: { ...request.headers, Origin: 'https://example.com' } });
    expect(response.status).toBe(403); expect(mock).not.toHaveBeenCalled();
  });
});
