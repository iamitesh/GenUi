import { describe, expect, it } from 'vitest';
import { applyMessage, createAction, emptyRuntime, finalize, readData, replay, writeData } from '../src/a2ui/runtime';
import { CATALOG_ID, VERSION } from '../src/a2ui/catalog';
import { scenarioMessages } from '../src/examples/scenarios';
import { parseNDJSON } from '../src/agent/transport';

const create = { version: VERSION, createSurface: { surfaceId: 'workspace', catalogId: CATALOG_ID } };
describe('A2UI envelope and catalog conformance', () => {
  it.each(['discover', 'compare', 'enquiry'] as const)('renders a complete %s message stream using the upstream envelope', scenario => {
    const state = replay(scenarioMessages(scenario));
    expect(state.surfaces.workspace.components.root).toBeDefined();
    expect(readData(state.surfaces.workspace.data, '/request/location')).toBe('Bengaluru');
  });
  it('rejects unknown components, props, actions and catalogs', () => {
    const state = applyMessage(emptyRuntime(), create);
    for (const component of [
      { id: 'root', component: 'RawHTML', html: '<script />' },
      { id: 'root', component: 'Text', text: 'Safe', style: 'position:fixed' },
      { id: 'root', component: 'Button', text: 'Run', action: { event: { name: 'execute_code' } } },
    ]) expect(() => applyMessage(state, { version: VERSION, updateComponents: { surfaceId: 'workspace', components: [component] } })).toThrow('Invalid A2UI');
    expect(() => applyMessage(emptyRuntime(), { version: VERSION, createSurface: { surfaceId: 'workspace', catalogId: 'unknown' } })).toThrow('Unsupported');
  });
  it('enforces surface creation and deletion lifecycle', () => {
    expect(() => applyMessage(emptyRuntime(), { version: VERSION, updateDataModel: { surfaceId: 'workspace', value: {} } })).toThrow('Create');
    const created = applyMessage(emptyRuntime(), create);
    expect(() => applyMessage(created, create)).toThrow('already exists');
    const deleted = applyMessage(created, { version: VERSION, deleteSurface: { surfaceId: 'workspace' } });
    expect(deleted.surfaces.workspace).toBeUndefined();
    expect(applyMessage(deleted, create).surfaces.workspace).toBeDefined();
  });
  it('allows forward references until finalization and rejects cycles atomically', () => {
    const created = applyMessage(emptyRuntime(), create);
    const pending = applyMessage(created, { version: VERSION, updateComponents: { surfaceId: 'workspace', components: [{ id: 'root', component: 'Column', children: ['late'] }] } });
    expect(() => finalize(pending)).toThrow('Missing child');
    expect(() => applyMessage(pending, { version: VERSION, updateComponents: { surfaceId: 'workspace', components: [{ id: 'late', component: 'Column', children: ['root'] }] } })).toThrow('Cyclic');
    expect(pending.surfaces.workspace.components.late).toBeUndefined();
    const complete = applyMessage(pending, { version: VERSION, updateComponents: { surfaceId: 'workspace', components: [{ id: 'late', component: 'Text', text: 'Ready' }] } });
    expect(finalize(complete)).toBe(complete);
  });
  it('rejects excessive nesting and duplicate component IDs', () => {
    const state = applyMessage(emptyRuntime(), create);
    const components = Array.from({ length: 23 }, (_, i) => ({ id: i === 0 ? 'root' : `n${i}`, component: 'Column', children: i === 22 ? [] : [`n${i + 1}`] }));
    expect(() => applyMessage(state, { version: VERSION, updateComponents: { surfaceId: 'workspace', components } })).toThrow('deep');
    expect(() => applyMessage(state, { version: VERSION, updateComponents: { surfaceId: 'workspace', components: [{ id: 'root', component: 'Text', text: 'A' }, { id: 'root', component: 'Text', text: 'B' }] } })).toThrow('Duplicate');
  });
});
describe('data model and actions', () => {
  it('replaces rather than merges, decodes pointers, and preserves array indices on delete', () => {
    const original = { request: { name: 'A', days: 14 }, list: ['first', 'second'], 'a/b': { '~key': 2 } };
    expect(writeData(original, '/request', { name: 'B' })).toEqual({ ...original, request: { name: 'B' } });
    expect(readData(original, '/a~1b/~0key')).toBe(2);
    const removed = writeData(original, '/list/0', undefined, true) as typeof original;
    expect(removed.list.length).toBe(2); expect(removed.list[0]).toBeUndefined(); expect(removed.list[1]).toBe('second');
    expect(original.list[0]).toBe('first');
    expect(writeData(original, '/', { replaced: true })).toEqual({ replaced: true });
  });
  it('blocks prototype pollution and invalid pointers', () => {
    expect(() => writeData({}, '/__proto__/polluted', true)).toThrow('Unsafe');
    expect(() => writeData({}, '/a~2b', true)).toThrow('JSON Pointer');
    expect(() => applyMessage(emptyRuntime(), JSON.parse('{"version":"v0.9.1","__proto__":{"polluted":true}}'))).toThrow('Unsafe');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it('keeps component identity during a data-only update and resolves action context at click time', () => {
    const original = replay(scenarioMessages('enquiry'));
    const edited = applyMessage(original, { version: VERSION, updateDataModel: { surfaceId: 'workspace', path: '/request/name', value: 'Amitesh' } });
    const surface = edited.surfaces.workspace;
    expect(surface.components).toBe(original.surfaces.workspace.components);
    const action = createAction(surface, 'review-button', { event: { name: 'enquiry.review', context: { request: { path: '/request' } } } });
    expect(action.action.context.request).toMatchObject({ name: 'Amitesh' });
    expect(action.version).toBe('v0.9.1'); expect(action.action.sourceComponentId).toBe('review-button');
  });
});
describe('NDJSON transport', () => {
  it('handles UTF-8 and message boundaries split across arbitrary chunks', async () => {
    const messages = scenarioMessages('discover');
    const encoded = new TextEncoder().encode(messages.map(m => JSON.stringify(m)).join('\r\n'));
    const stream = new ReadableStream<Uint8Array>({ start(c) { for (let i = 0; i < encoded.length; i += 7) c.enqueue(encoded.slice(i, i + 7)); c.close(); } });
    const received = [];
    for await (const m of parseNDJSON(stream, new AbortController().signal)) received.push(m);
    expect(received).toEqual(messages);
  });
  it('rejects truncated JSON and respects cancellation', async () => {
    const stream = () => new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode('{"version":')); c.close(); } });
    const collect = async (signal: AbortSignal) => { for await (const _ of parseNDJSON(stream(), signal)) { /* consume */ } };
    await expect(collect(new AbortController().signal)).rejects.toThrow();
    const controller = new AbortController(); controller.abort();
    await expect(collect(controller.signal)).rejects.toThrow();
  });
});
