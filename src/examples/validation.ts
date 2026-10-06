import type { WorkspaceData } from './scenarios.ts';
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function assertWorkspaceData(value: unknown): asserts value is WorkspaceData {
  if (!isRecord(value) || !Array.isArray(value.shortlist) || value.shortlist.length > 3 || !value.shortlist.every(id => ['mini', 'medium', 'large'].includes(id)) || !isRecord(value.request)) throw new Error('The workspace data must preserve the request and shortlist.');
  const request = value.request;
  for (const key of ['location', 'project', 'equipment', 'name', 'email', 'note']) if (typeof request[key] !== 'string' || request[key].length > 2000) throw new Error(`Invalid request field: ${key}`);
  if (typeof request.days !== 'number' || !Number.isInteger(request.days) || request.days < 1 || request.days > 90 || typeof request.consent !== 'boolean' || !['mini', 'medium', 'large'].includes(String(request.equipment))) throw new Error('Invalid rental request data.');
}
