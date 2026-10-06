import {
  Badge, Button, Checkbox, Divider, Heading, Item, NumberField, Picker,
  TableView, TableHeader, TableBody, Column as TableColumn, Row as TableRow, Cell,
  Text, TextField, View, Provider, defaultTheme,
} from '@adobe/react-spectrum';
import { ArrowUpRight, Construction, MoveUpRight, Truck } from 'lucide-react';
import { CATALOG_ID, type Binding } from '../a2ui/catalog';
import { resolveValue } from '../a2ui/runtime';
import { findEquipment, money } from '../examples/equipment';
import type { AdapterProps, DesignSystemAdapter } from './types';

const value = (p: AdapterProps, key: string) => resolveValue(p.node[key], p.surface.data);
const text = (v: unknown): string => typeof v === 'string' || typeof v === 'number' ? String(v) : '';
const path = (p: AdapterProps) => (p.node.value as Binding).path;

function Column({ node, children }: AdapterProps) { return <div className={`ui-column gap-${node.gap ?? 'medium'}`}>{children}</div>; }
function Row({ children }: AdapterProps) { return <div className="ui-row">{children}</div>; }
function Grid({ node, children }: AdapterProps) { return <div className={`ui-grid columns-${node.columns ?? 2}`}>{children}</div>; }
function Card({ node, children }: AdapterProps) { return <View elementType="section" UNSAFE_className={`ui-card tone-${node.tone ?? 'default'}`}>{children}</View>; }
function TextNode(p: AdapterProps) {
  const content = text(value(p, 'text'));
  if (p.node.variant === 'title') return <Heading level={2} UNSAFE_className="surface-title">{content}</Heading>;
  if (p.node.variant === 'heading') return <Heading level={3} UNSAFE_className="section-title">{content}</Heading>;
  return <Text UNSAFE_className={`ui-text text-${p.node.variant ?? 'body'}`}>{content}</Text>;
}
function ButtonNode(p: AdapterProps) { return <Button variant={(p.node.variant as 'accent' | 'primary' | 'secondary') ?? 'secondary'} onPress={() => p.onAction(p.node.id, p.node.action as Parameters<AdapterProps['onAction']>[1])}>{text(value(p, 'text'))}</Button>; }
function TextFieldNode(p: AdapterProps) { return <TextField width="100%" label={text(p.node.label)} value={text(value(p, 'value'))} description={text(p.node.placeholder) || undefined} isRequired={Boolean(p.node.required)} onChange={v => p.onChange(path(p), v)} />; }
function NumberFieldNode(p: AdapterProps) { const n = Number(value(p, 'value')); return <NumberField width="100%" label={text(p.node.label)} value={Number.isFinite(n) ? n : 1} minValue={1} maxValue={90} onChange={v => p.onChange(path(p), Number.isFinite(v) ? v : 1)} />; }
function PickerNode(p: AdapterProps) { return <Picker width="100%" label={text(p.node.label)} selectedKey={text(value(p, 'value'))} onSelectionChange={v => p.onChange(path(p), String(v))} items={p.node.options as { id: string; label: string }[]}>{item => <Item key={item.id}>{item.label}</Item>}</Picker>; }
function CheckboxNode(p: AdapterProps) { return <Checkbox isSelected={value(p, 'value') === true} onChange={v => p.onChange(path(p), v)}>{text(p.node.label)}</Checkbox>; }
function BadgeNode(p: AdapterProps) { const variant = p.node.tone === 'positive' ? 'positive' : p.node.tone === 'notice' ? 'yellow' : p.node.tone === 'info' ? 'info' : 'neutral'; return <Badge variant={variant}>{text(value(p, 'text'))}</Badge>; }
function DividerNode() { return <Divider size="S" />; }
function Metric(p: AdapterProps) { return <View UNSAFE_className="metric"><Text UNSAFE_className="metric-label">{text(p.node.label)}</Text><Text UNSAFE_className="metric-value">{text(value(p, 'value'))}</Text><Text UNSAFE_className="text-muted">{text(value(p, 'detail'))}</Text></View>; }
function TableNode(p: AdapterProps) {
  const columns = p.node.columns as { key: string; label: string }[];
  const raw = value(p, 'rows');
  const rows = (Array.isArray(raw) ? raw : []).filter((row): row is Record<string, unknown> => !!row && typeof row === 'object').slice(0, 100);
  return <div className="table-scroll"><TableView aria-label={text(p.node.label)} width="100%" minWidth="460px" overflowMode="wrap" density="spacious">
    <TableHeader columns={columns}>{column => <TableColumn key={column.key} isRowHeader={column.key === columns[0].key}>{column.label}</TableColumn>}</TableHeader>
    <TableBody items={rows.map((row, index) => ({ ...row, rowId: String(index) }))}>{row => <TableRow key={row.rowId}>{key => <Cell>{text(row[String(key) as keyof typeof row])}</Cell>}</TableRow>}</TableBody>
  </TableView></div>;
}
function EquipmentCard(p: AdapterProps) {
  const item = findEquipment(p.node.equipmentId);
  const selection = value(p, 'selection');
  const selected = Array.isArray(selection) && selection.includes(item.id);
  const Icon = item.id === 'mini' ? Construction : item.id === 'medium' ? Truck : MoveUpRight;
  return <View elementType="article" UNSAFE_className={`equipment-card ${selected ? 'selected' : ''}`}>
    <div className={`equipment-art art-${item.id}`}><span className="art-number">{item.capacity.replace(' t', '')}<span>TONNE</span></span><Icon size={82} strokeWidth={1} aria-hidden="true" /><span className="art-label">TERRA / {item.id === 'mini' ? '01' : item.id === 'medium' ? '02' : '03'}</span></div>
    <div className="equipment-content">
      <span className="equipment-category">{item.category}</span>
      <Heading level={3} UNSAFE_className="equipment-name">{item.name}</Heading>
      <Text UNSAFE_className="equipment-description">{item.description}</Text>
      <div className="equipment-specs"><span><b>{item.power}</b>Power</span><span><b>{item.reach}</b>Reach</span></div>
      <div className="equipment-price"><strong>{money(item.dayRate)}</strong><span>/ day · sample rate</span></div>
      <Divider size="S" />
      <div className="equipment-actions"><Checkbox aria-label={`Shortlist ${item.name}`} isSelected={selected} onChange={() => p.onAction(p.node.id, { event: { name: 'shortlist.toggle', context: { equipmentId: item.id } } })}>Shortlist</Checkbox><Button variant="secondary" style="outline" onPress={() => p.onAction(p.node.id, { event: { name: 'enquiry.open', context: { equipmentId: item.id } } })}><Text>Enquire</Text><ArrowUpRight size={14} /></Button></div>
    </div>
  </View>;
}

export const spectrumAdapter: DesignSystemAdapter = {
  id: 'spectrum', name: 'Adobe Spectrum', catalogId: CATALOG_ID,
  Provider: ({ children, colorScheme }) => <Provider theme={defaultTheme} colorScheme={colorScheme}>{children}</Provider>,
  components: { Column, Row, Grid, Card, Text: TextNode, Button: ButtonNode, TextField: TextFieldNode, NumberField: NumberFieldNode, Picker: PickerNode, Checkbox: CheckboxNode, Badge: BadgeNode, Divider: DividerNode, Metric, Table: TableNode, EquipmentCard },
};
