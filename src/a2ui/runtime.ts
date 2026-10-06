import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import serverSchema from './upstream/server_to_client.json' with { type: 'json' };
import clientSchema from './upstream/client_to_server.json' with { type: 'json' };
import { ACTIONS, CATALOG_ID, VERSION, catalogAlias, catalogSchema, type Component, type ActionDefinition } from './catalog.ts';

export type Message =
  | { version: typeof VERSION; createSurface: { surfaceId: string; catalogId: string; theme?: { colorScheme?: 'light' | 'dark' }; sendDataModel?: boolean } }
  | { version: typeof VERSION; updateComponents: { surfaceId: string; components: Component[] } }
  | { version: typeof VERSION; updateDataModel: { surfaceId: string; path?: string; value?: unknown } }
  | { version: typeof VERSION; deleteSurface: { surfaceId: string } };
export interface Surface { id: string; catalogId: string; theme?: { colorScheme?: 'light' | 'dark' }; components: Record<string, Component>; data: unknown }
export interface Runtime { surfaces: Record<string, Surface>; count: number }
export interface ClientAction { version: typeof VERSION; action: { name: string; surfaceId: string; sourceComponentId: string; timestamp: string; context: Record<string, unknown> } }

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(catalogSchema, catalogAlias);
const validateEnvelope = ajv.compile(serverSchema);
const validateClient = ajv.compile(clientSchema);
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export const emptyRuntime = (): Runtime => ({ surfaces: {}, count: 0 });

function safeJson(value: unknown, depth = 0): void {
  if (depth > 24) throw new Error('Payload exceeds the nesting limit.');
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) throw new Error('Unsafe object key.');
    safeJson(child, depth + 1);
  }
}

function segments(path: string): string[] {
  if (!path.startsWith('/') || path.length > 256 || /~(?![01])/u.test(path)) throw new Error('Expected an absolute JSON Pointer.');
  const result = path === '/' ? [] : path.slice(1).split('/').map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  if (result.some(p => forbidden.has(p))) throw new Error('Unsafe data path.');
  return result;
}

function validateBindings(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (!Array.isArray(value) && Object.keys(value).length === 1 && 'path' in value && typeof value.path === 'string') segments(value.path);
  else Object.values(value).forEach(validateBindings);
}

export function readData(data: unknown, path: string): unknown {
  return segments(path).reduce<unknown>((value, key) => value && typeof value === 'object' && Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined, data);
}

export function writeData(data: unknown, path: string, value: unknown, remove = false): unknown {
  safeJson(value);
  const keys = segments(path);
  if (!keys.length) return remove ? {} : structuredClone(value);
  const root = data && typeof data === 'object' ? structuredClone(data) : {};
  let cursor = root as Record<string, unknown>;
  for (const [index, key] of keys.entries()) {
    if (Array.isArray(cursor) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) > 10000)) throw new Error('Invalid array index.');
    if (index === keys.length - 1) {
      if (remove) delete cursor[key]; else cursor[key] = structuredClone(value);
    } else {
      if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = /^\d+$/.test(keys[index + 1]) ? [] : {};
      cursor = cursor[key] as Record<string, unknown>;
    }
  }
  return root;
}

export function resolveValue(value: unknown, data: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (Object.keys(value).length === 1 && 'path' in value && typeof value.path === 'string') return readData(data, value.path);
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, resolveValue(child, data)]));
  }
  if (Array.isArray(value)) return value.map(v => resolveValue(v, data));
  return value;
}

function checkGraph(surface: Surface, final = false): void {
  if (Object.keys(surface.components).length > 250) throw new Error('Component limit exceeded.');
  if (final && !surface.components.root) throw new Error('A completed surface must have a root component.');
  let visits = 0;
  const visit = (id: string, trail: Set<string>, depth: number) => {
    if (++visits > 2000) throw new Error('Component expansion limit exceeded.');
    if (depth > 20 || trail.has(id)) throw new Error('Cyclic or excessively deep component graph.');
    const node = surface.components[id];
    if (!node) { if (final) throw new Error(`Missing child component: ${id}`); return; }
    if (Array.isArray(node.children)) {
      if (new Set(node.children).size !== node.children.length) throw new Error('Duplicate child reference.');
      for (const child of node.children) visit(String(child), new Set([...trail, id]), depth + 1);
    }
  };
  // Validate disconnected components too, so a later root update cannot expose a hidden cycle.
  for (const id of Object.keys(surface.components)) visit(id, new Set(), 0);
}

export function applyMessage(runtime: Runtime, raw: unknown): Runtime {
  if (runtime.count >= 100) throw new Error('Message limit exceeded.');
  if (JSON.stringify(raw)?.length > 500_000) throw new Error('Message too large.');
  safeJson(raw);
  if (!validateEnvelope(raw)) throw new Error(`Invalid A2UI message: ${ajv.errorsText(validateEnvelope.errors, { separator: '; ' }).slice(0, 400)}`);
  const message = raw as Message;
  if (message.version !== VERSION) throw new Error(`This example pins ${VERSION}.`);
  const operation = 'createSurface' in message ? message.createSurface : 'updateComponents' in message ? message.updateComponents : 'updateDataModel' in message ? message.updateDataModel : message.deleteSurface;
  const id = operation.surfaceId;
  if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(id) || forbidden.has(id)) throw new Error('Invalid surface ID.');
  const surfaces = { ...runtime.surfaces };
  if ('createSurface' in message) {
    if (surfaces[id]) throw new Error('Surface already exists. Delete it before recreating it.');
    if (message.createSurface.catalogId !== CATALOG_ID) throw new Error('Unsupported component catalog.');
    if (message.createSurface.sendDataModel) throw new Error('Full-model transport synchronization is outside this sample; use explicit action context.');
    if (Object.keys(surfaces).length >= 4) throw new Error('Surface limit exceeded.');
    surfaces[id] = { id, catalogId: CATALOG_ID, theme: message.createSurface.theme, components: {}, data: {} };
  } else {
    if (!surfaces[id]) throw new Error('Create the surface before updating or deleting it.');
    if ('deleteSurface' in message) delete surfaces[id];
    else {
      const surface = { ...surfaces[id] };
      if ('updateComponents' in message) {
        surface.components = { ...surface.components };
        const ids = new Set<string>();
        for (const component of message.updateComponents.components) {
          if (ids.has(component.id) || forbidden.has(component.id)) throw new Error('Duplicate or unsafe component ID.');
          ids.add(component.id);
          validateBindings(component);
          surface.components[component.id] = structuredClone(component);
        }
        checkGraph(surface);
      } else {
        const update = message.updateDataModel;
        surface.data = writeData(surface.data, update.path ?? '/', update.value, !Object.hasOwn(update, 'value'));
      }
      surfaces[id] = surface;
    }
  }
  return { surfaces, count: runtime.count + 1 };
}

export function finalize(runtime: Runtime): Runtime {
  if (!Object.keys(runtime.surfaces).length) throw new Error('No surface was generated.');
  Object.values(runtime.surfaces).forEach(surface => checkGraph(surface, true));
  return runtime;
}
export function replay(messages: unknown[]): Runtime { return finalize(messages.reduce<Runtime>(applyMessage, emptyRuntime())); }

export function createAction(surface: Surface, sourceComponentId: string, definition: ActionDefinition): ClientAction {
  if (!surface.components[sourceComponentId] || !ACTIONS.includes(definition.event.name)) throw new Error('Unsupported action source or name.');
  const message: ClientAction = { version: VERSION, action: { name: definition.event.name, surfaceId: surface.id, sourceComponentId, timestamp: new Date().toISOString(), context: resolveValue(definition.event.context ?? {}, surface.data) as Record<string, unknown> } };
  if (!validateClient(message)) throw new Error('Invalid client action.');
  return message;
}
