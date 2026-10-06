import { CATALOG_ID, VERSION, type Component } from '../a2ui/catalog.ts';
import type { Message } from '../a2ui/runtime.ts';
import { equipment, findEquipment, money } from './equipment.ts';

export type Scenario = 'discover' | 'compare' | 'enquiry';
export interface WorkspaceData {
  shortlist: string[];
  request: { location: string; days: number; project: string; equipment: string; name: string; email: string; note: string; consent: boolean };
  [key: string]: unknown;
}
export const initialData = (): WorkspaceData => ({ shortlist: ['medium', 'large'], request: { location: 'Bengaluru', days: 14, project: 'Foundations', equipment: 'medium', name: '', email: '', note: '', consent: false } });
export const scenarios = [
  { id: 'discover' as const, label: 'Equipment discovery', short: 'Discover', prompt: 'Find excavators for a two-week project in Bengaluru', description: 'Turn a requirement into a curated collection.', icon: 'search' },
  { id: 'compare' as const, label: 'Side-by-side comparison', short: 'Compare', prompt: 'Compare my shortlisted machines side by side', description: 'Make a decision with a focused comparison.', icon: 'compare' },
  { id: 'enquiry' as const, label: 'Rental enquiry', short: 'Enquire', prompt: 'Prepare a rental enquiry for my project', description: 'Move from exploration to a useful next step.', icon: 'form' },
];
export function inferScenario(prompt: string): Scenario {
  if (/enquir|rent.*form|quote|book|contact|request.*rental/i.test(prompt)) return 'enquiry';
  if (/compar|side.by.side|difference/i.test(prompt)) return 'compare';
  return 'discover';
}
const c = (id: string, component: Component['component'], props: Record<string, unknown>): Component => ({ id, component, ...props });
const event = (name: string, context: Record<string, unknown> = {}) => ({ event: { name, context } });

export function scenarioMessages(scenario: Scenario, input = initialData(), prompt = ''): Message[] {
  const data = structuredClone(input);
  const location = prompt.match(/\bin (Bengaluru|Bangalore|Ranchi|Mumbai|Chennai|Hyderabad|Delhi)\b/i)?.[1];
  if (location) data.request.location = location.toLowerCase() === 'bangalore' ? 'Bengaluru' : location[0].toUpperCase() + location.slice(1).toLowerCase();
  const days = prompt.match(/\b(\d{1,2})\s*days?\b/i)?.[1];
  if (days) data.request.days = Math.min(90, Math.max(1, Number(days)));
  if (/two.week|2.week/i.test(prompt)) data.request.days = 14;
  let nodes: Component[];
  if (scenario === 'discover') {
    const items = /small|mini|compact/i.test(prompt) ? [equipment[0]] : equipment;
    data.resultSummary = `${items.length} sample machines · ${data.request.location} · ${data.request.days} days`;
    nodes = [
      c('root', 'Column', { children: ['headline', 'result-summary', 'equipment-grid', 'discover-footer'], gap: 'large' }),
      c('headline', 'Text', { text: 'The right machine. For your next project.', variant: 'title' }),
      c('result-summary', 'Text', { text: { path: '/resultSummary' }, variant: 'muted' }),
      c('equipment-grid', 'Grid', { children: items.map(item => `equipment-${item.id}`), columns: 3 }),
      ...items.map(item => c(`equipment-${item.id}`, 'EquipmentCard', { equipmentId: item.id, selection: { path: '/shortlist' } })),
      c('discover-footer', 'Row', { children: ['compare-button', 'fixture-note'] }),
      c('compare-button', 'Button', { text: 'Compare shortlist', variant: 'accent', action: event('equipment.compare', { ids: { path: '/shortlist' } }) }),
      c('fixture-note', 'Text', { text: 'Illustrative equipment and rates. Confirm specifications and availability with a dealer.', variant: 'muted' }),
    ];
  } else if (scenario === 'compare') {
    const selected = equipment.filter(e => data.shortlist.includes(e.id));
    const items = selected.length >= 2 ? selected : [equipment[1], equipment[2]];
    data.comparison = [
      { id: 'type', label: 'Best suited to', ...Object.fromEntries(items.map(e => [e.id, e.suitability])) },
      { id: 'weight', label: 'Operating weight', ...Object.fromEntries(items.map(e => [e.id, e.capacity])) },
      { id: 'power', label: 'Engine power', ...Object.fromEntries(items.map(e => [e.id, e.power])) },
      { id: 'reach', label: 'Maximum reach', ...Object.fromEntries(items.map(e => [e.id, e.reach])) },
      { id: 'rate', label: 'Illustrative daily rate', ...Object.fromEntries(items.map(e => [e.id, money(e.dayRate)])) },
      { id: 'total', label: `${data.request.days}-day base estimate`, ...Object.fromEntries(items.map(e => [e.id, money(e.dayRate * data.request.days)])) },
      { id: 'available', label: 'Availability', ...Object.fromEntries(items.map(e => [e.id, e.availability])) },
    ];
    nodes = [
      c('root', 'Column', { children: ['headline', 'comparison-note', 'compare-cards', 'comparison-table', 'comparison-footer'], gap: 'large' }),
      c('headline', 'Text', { text: 'A clearer view of your options.', variant: 'title' }),
      c('comparison-note', 'Text', { text: `${selected.length < 2 ? 'Select at least two to compare your own shortlist. Showing a sample pair. ' : ''}Compare the details that matter for your ${data.request.days}-day project.`, variant: 'muted' }),
      c('compare-cards', 'Grid', { children: items.map(e => `metric-${e.id}`), columns: items.length }),
      ...items.map(e => c(`metric-${e.id}`, 'Metric', { label: e.name, value: money(e.dayRate * data.request.days), detail: `Sample base hire · ${data.request.days} days` })),
      c('comparison-table', 'Table', { label: 'Equipment comparison', columns: [{ key: 'label', label: 'Specification' }, ...items.map(e => ({ key: e.id, label: e.name }))], rows: { path: '/comparison' } }),
      c('comparison-footer', 'Row', { children: ['enquiry-button', 'estimate-note'] }),
      c('enquiry-button', 'Button', { text: 'Build a rental enquiry', variant: 'accent', action: event('enquiry.open', { equipmentId: items[0].id }) }),
      c('estimate-note', 'Text', { text: 'Demo estimates exclude taxes, transport, fuel and operator charges.', variant: 'muted' }),
    ];
  } else {
    const item = findEquipment(data.request.equipment);
    nodes = [
      c('root', 'Column', { children: ['headline', 'enquiry-note', 'form-layout', 'enquiry-actions'], gap: 'large' }),
      c('headline', 'Text', { text: 'Your project, one step closer.', variant: 'title' }),
      c('enquiry-note', 'Text', { text: 'Shape your request, then review a local draft. Nothing is sent to a dealer.', variant: 'muted' }),
      c('form-layout', 'Grid', { children: ['form-card', 'summary-card'], columns: 2 }),
      c('form-card', 'Card', { children: ['form-title', 'location', 'days', 'project', 'contact-name', 'contact-email', 'project-note', 'consent'] }),
      c('form-title', 'Text', { text: 'Rental details', variant: 'heading' }),
      c('location', 'TextField', { label: 'Project location', value: { path: '/request/location' }, required: true }),
      c('days', 'NumberField', { label: 'Rental duration (days)', value: { path: '/request/days' } }),
      c('project', 'Picker', { label: 'Project type', value: { path: '/request/project' }, options: ['Foundations', 'Urban groundwork', 'Earthmoving'].map(x => ({ id: x, label: x })) }),
      c('contact-name', 'TextField', { label: 'Your name', value: { path: '/request/name' }, required: true, placeholder: 'Name for the enquiry' }),
      c('contact-email', 'TextField', { label: 'Email', value: { path: '/request/email' }, required: true, placeholder: 'you@company.com' }),
      c('project-note', 'TextField', { label: 'Project notes (optional)', value: { path: '/request/note' }, placeholder: 'Access, terrain, or other requirements' }),
      c('consent', 'Checkbox', { label: 'I understand these are illustrative rates.', value: { path: '/request/consent' } }),
      c('summary-card', 'Card', { tone: 'accent', children: ['summary-badge', 'summary-name', 'summary-location', 'summary-rate', 'summary-description', 'summary-divider', 'summary-fineprint'] }),
      c('summary-badge', 'Badge', { text: 'YOUR SELECTED MACHINE', tone: 'info' }),
      c('summary-name', 'Text', { text: item.name, variant: 'title' }),
      c('summary-location', 'Text', { text: { path: '/request/location' }, variant: 'muted' }),
      c('summary-rate', 'Metric', { label: 'Illustrative daily rate', value: money(item.dayRate), detail: 'Final quote and availability need confirmation.' }),
      c('summary-description', 'Text', { text: item.description }),
      c('summary-divider', 'Divider', {}),
      c('summary-fineprint', 'Text', { text: 'This demo creates a draft in your current browser session. It does not book equipment or send an enquiry.', variant: 'muted' }),
      c('enquiry-actions', 'Row', { children: ['review-button'] }),
      c('review-button', 'Button', { text: 'Review enquiry', variant: 'accent', action: event('enquiry.review', { request: { path: '/request' } }) }),
    ];
  }
  return [
    { version: VERSION, createSurface: { surfaceId: 'workspace', catalogId: CATALOG_ID } },
    { version: VERSION, updateDataModel: { surfaceId: 'workspace', value: data } },
    { version: VERSION, updateComponents: { surfaceId: 'workspace', components: nodes } },
  ];
}
