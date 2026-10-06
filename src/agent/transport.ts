import type { Message } from '../a2ui/runtime';
import { scenarioMessages, inferScenario, type WorkspaceData } from '../examples/scenarios';

export interface AgentRequest { prompt: string; data: WorkspaceData }
export interface AgentTransport { generate(request: AgentRequest, signal: AbortSignal): AsyncIterable<Message> }

export const demoTransport: AgentTransport = {
  async *generate(request, signal) {
    // Deterministic fixture selection, deliberately not presented as an LLM.
    for (const message of scenarioMessages(inferScenario(request.prompt), request.data, request.prompt)) {
      signal.throwIfAborted();
      await new Promise(resolve => setTimeout(resolve, 160));
      signal.throwIfAborted();
      yield message;
    }
  },
};

export async function* parseNDJSON(stream: ReadableStream<Uint8Array>, signal: AbortSignal): AsyncGenerator<Message> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '', size = 0, count = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_000_000) throw new Error('Agent response exceeds 1 MB.');
      buffer += decoder.decode(value, { stream: true });
      let index: number;
      while ((index = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, index).trim(); buffer = buffer.slice(index + 1);
        if (line) { if (++count > 100) throw new Error('Agent sent too many messages.'); yield JSON.parse(line) as Message; }
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) { if (++count > 100) throw new Error('Agent sent too many messages.'); yield JSON.parse(buffer) as Message; }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export const httpTransport: AgentTransport = {
  async *generate(request, signal) {
    const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal });
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(result.error ?? 'The model connection is unavailable. Run npm run dev with a server-side Gemini key.');
    }
    if (!response.body || !response.headers.get('content-type')?.includes('application/x-ndjson')) throw new Error('Expected an A2UI NDJSON response.');
    yield* parseNDJSON(response.body, signal);
  },
};
