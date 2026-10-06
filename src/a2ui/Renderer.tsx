import { Component as ReactComponent, type ReactNode } from 'react';
import type { ActionDefinition } from './catalog';
import type { Surface } from './runtime';
import type { DesignSystemAdapter } from '../adapters/types';

interface Props { surface: Surface; adapter: DesignSystemAdapter; onChange: (path: string, value: unknown) => void; onAction: (id: string, action: ActionDefinition) => void }
function SurfaceNode({ id, depth = 0, ...props }: Props & { id: string; depth?: number }): ReactNode {
  const node = props.surface.components[id];
  if (!node) return <span className="render-placeholder" aria-label="Waiting for component" />;
  if (depth > 20) return <p role="alert">The component nesting limit was reached.</p>;
  const View = props.adapter.components[node.component];
  if (!View) return <p role="alert">Unsupported component: {node.component}</p>;
  return <View node={node} surface={props.surface} onChange={props.onChange} onAction={props.onAction}>{Array.isArray(node.children) ? node.children.map(id => <SurfaceNode {...props} key={String(id)} id={String(id)} depth={depth + 1} />) : null}</View>;
}
class RenderBoundary extends ReactComponent<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <p role="alert">This surface could not be rendered. Choose an example to recover.</p> : this.props.children; }
}
export function Renderer(props: Props & { revision: number }) {
  if (props.surface.catalogId !== props.adapter.catalogId) return <p role="alert">This renderer does not support the selected catalog.</p>;
  const Provider = props.adapter.Provider;
  return <RenderBoundary key={props.revision}><Provider colorScheme={props.surface.theme?.colorScheme}><SurfaceNode {...props} id="root" /></Provider></RenderBoundary>;
}
