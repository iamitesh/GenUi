# Add MUI, shadcn/ui, or another design system

The agent knows semantic catalog names, not React imports. Keep those names and their behavior stable when implementing an adapter. The current examples only ship Adobe Spectrum.

## Component mapping

The final two columns below are implementation suggestions, not shipped adapters.

| Catalog | Adobe Spectrum implementation | Proposed MUI implementation | Proposed shadcn/ui implementation |
| --- | --- | --- | --- |
| Column, Row, Grid | CSS layout primitives | Stack/Grid/Box | Flex/grid wrappers |
| Card | Spectrum View + application styles | Card/CardContent | Card/CardContent |
| Text | Text or Heading | Typography | Semantic text/heading wrapper |
| Button | Button `onPress` | Button `onClick` | Button `onClick` |
| TextField | Labelled TextField | TextField | Label + Input + help text |
| NumberField | NumberField | Numeric TextField with constraints | Label + numeric Input with constraints |
| Picker | Picker + Item | FormControl + Select + MenuItem | Label + Select |
| Checkbox | Checkbox | FormControlLabel + Checkbox | Label + Checkbox |
| Badge | Badge | Chip | Badge |
| Divider | Divider | Divider | Separator |
| Metric | View + Text composition | Card + Typography composition | Card + text composition |
| Table | TableView and collection children | Table + header/body cells | Table components |
| EquipmentCard | Fixture-backed View, Heading, Checkbox and Button composition | Same domain composition using MUI | Same domain composition using shadcn/ui |

## Adapter contract

Implement `src/adapters/types.ts`:

```tsx
const muiAdapter: DesignSystemAdapter = {
  id: 'mui',
  name: 'Material UI',
  catalogId: CATALOG_ID,
  Provider: MuiSurfaceProvider,
  components: {
    // Supply EVERY ComponentName using MUI-backed components.
    // TypeScript reports any missing mapping.
  },
};
```

This is a contract sketch, not a complete adapter. Install the chosen design system and implement each mapping before registering it. Do not spread agent JSON into component props; explicitly map approved fields.

Each mapped component receives:

- `node`: validated catalog component with stable `id`.
- `surface`: component map and current data model.
- `children`: already-rendered child nodes for layouts.
- `onChange(path, value)`: local two-way data update.
- `onAction(componentId, definition)`: an allowlisted named event.

Use `resolveValue(node.value, surface.data)` for bindings, and `onChange` for input updates. Map variants semantically: an A2UI `accent` button may become a primary contained MUI button or a default shadcn/ui button.

The adapter Provider owns its theme. The playground shell currently uses Spectrum separately; changing just the canvas adapter does not change the shell. Add a canvas adapter registry and selector when a second adapter is complete.

## Accessibility and parity

- Keep visible labels, semantic heading levels and table row headers.
- Match number limits and validation behavior across adapters.
- Preserve focus and drafts during data-only updates.
- Translate each event exactly once. Spectrum `onPress`, MUI `onClick`, and shadcn `onCheckedChange` are not identical APIs.
- Keep local shortlist and form edits immediate; invoke the agent only for a new task.
- Run the same discover → compare → review journey and mobile layout checks for each adapter.

## Versioning

Adding a compatible mapping does not change the catalog ID. Changing component meaning or required properties does. Add schema entries, typed renderer mappings, fixtures and behavior checks together. A protocol-compatible client cannot render a component unless it also implements the matching catalog.
