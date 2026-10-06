/** Application-owned catalog. These are not Google's Basic Catalog components. */
export const CATALOG_ID = 'https://github.com/iamitesh/GenUi/catalogs/workspace-v1';
export const VERSION = 'v0.9.1' as const;
export const ACTIONS = ['shortlist.toggle', 'equipment.compare', 'enquiry.open', 'enquiry.review'] as const;
const string = { type: 'string', maxLength: 4000 };
const binding = { type: 'object', properties: { path: { type: 'string', pattern: '^/', maxLength: 256 } }, required: ['path'], additionalProperties: false };
const text = { oneOf: [string, binding] };
const number = { oneOf: [{ type: 'number' }, binding] };
const children = { type: 'array', items: { type: 'string', maxLength: 80 }, maxItems: 100 };
const action = { type: 'object', properties: { event: { type: 'object', properties: { name: { enum: ACTIONS }, context: { type: 'object', maxProperties: 20 } }, required: ['name'], additionalProperties: false } }, required: ['event'], additionalProperties: false };
const options = { type: 'array', maxItems: 30, items: { type: 'object', properties: { id: string, label: string }, required: ['id', 'label'], additionalProperties: false } };

export const definitions = {
  Column: { description: 'Vertical stack, with optional spacing.', props: { children, gap: { enum: ['small', 'medium', 'large'] } }, required: ['children'] },
  Row: { description: 'Wrapping horizontal stack.', props: { children }, required: ['children'] },
  Grid: { description: 'Responsive one, two or three column grid.', props: { children, columns: { enum: [1, 2, 3] } }, required: ['children'] },
  Card: { description: 'A surface grouping related content.', props: { children, tone: { enum: ['default', 'subtle', 'accent'] } }, required: ['children'] },
  Text: { description: 'Plain text or semantic heading. HTML is never interpreted.', props: { text, variant: { enum: ['title', 'heading', 'body', 'muted', 'eyebrow'] } }, required: ['text'] },
  Button: { description: 'An explicit allowlisted event.', props: { text, variant: { enum: ['accent', 'primary', 'secondary'] }, action }, required: ['text', 'action'] },
  TextField: { description: 'Editable text with two-way absolute path binding.', props: { label: string, value: binding, placeholder: string, required: { type: 'boolean' } }, required: ['label', 'value'] },
  NumberField: { description: 'Rental duration input, 1–90 days.', props: { label: string, value: binding }, required: ['label', 'value'] },
  Picker: { description: 'Single selection from a finite list.', props: { label: string, value: binding, options }, required: ['label', 'value', 'options'] },
  Checkbox: { description: 'Boolean choice with a visible label.', props: { label: string, value: binding }, required: ['label', 'value'] },
  Badge: { description: 'Short status label.', props: { text, tone: { enum: ['neutral', 'positive', 'info', 'notice'] } }, required: ['text'] },
  Divider: { description: 'Separates groups.', props: {}, required: [] },
  Metric: { description: 'Label, value, and a short annotation.', props: { label: string, value: text, detail: text }, required: ['label', 'value'] },
  Table: { description: 'Accessible comparison of fixture specifications.', props: { label: string, columns: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'object', properties: { key: string, label: string }, required: ['key', 'label'], additionalProperties: false } }, rows: binding }, required: ['label', 'columns', 'rows'] },
  EquipmentCard: { description: 'Fixture-backed equipment summary, shortlist control, and enquiry action. Never accepts invented product specifications.', props: { equipmentId: { enum: ['mini', 'medium', 'large'] }, selection: binding }, required: ['equipmentId', 'selection'] },
} satisfies Record<string, { description: string; props: object; required: string[] }>;

export type ComponentName = keyof typeof definitions;
export interface Component { id: string; component: ComponentName; [key: string]: unknown }
export interface Binding { path: string }
export interface ActionDefinition { event: { name: typeof ACTIONS[number]; context?: Record<string, unknown> } }

export const catalogSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: CATALOG_ID,
  title: 'GenUI workspace catalog v1',
  $defs: {
    theme: { type: 'object', properties: { colorScheme: { enum: ['light', 'dark'] } }, additionalProperties: false },
    anyComponent: { oneOf: Object.entries(definitions).map(([component, def]) => ({
      type: 'object', description: def.description,
      properties: { id: { type: 'string', pattern: '^[a-zA-Z][a-zA-Z0-9_-]{0,79}$' }, component: { const: component }, ...def.props },
      required: ['id', 'component', ...def.required], additionalProperties: false,
    })) },
  },
};

// An alias resolves the unmodified upstream envelope's catalog.json reference.
export const catalogAlias = 'https://a2ui.org/specification/v0_9/catalog.json';
