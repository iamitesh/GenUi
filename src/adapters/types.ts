import type { ComponentType, ReactNode } from 'react';
import type { ActionDefinition, Component, ComponentName } from '../a2ui/catalog';
import type { Surface } from '../a2ui/runtime';

export interface AdapterProps {
  node: Component;
  surface: Surface;
  children?: ReactNode;
  onChange: (path: string, value: unknown) => void;
  onAction: (componentId: string, action: ActionDefinition) => void;
}
export interface DesignSystemAdapter {
  id: string;
  name: string;
  catalogId: string;
  Provider: ComponentType<{ children: ReactNode; colorScheme?: 'light' | 'dark' }>;
  components: Record<ComponentName, ComponentType<AdapterProps>>;
}
