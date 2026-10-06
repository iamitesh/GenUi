import { mkdir, writeFile } from 'node:fs/promises';
import { scenarioMessages, scenarios } from '../src/examples/scenarios.ts';
import { catalogSchema } from '../src/a2ui/catalog.ts';

await mkdir(new URL('../examples/', import.meta.url), { recursive: true });
await mkdir(new URL('../catalogs/', import.meta.url), { recursive: true });
for (const scenario of scenarios) await writeFile(new URL(`../examples/${scenario.id}.a2ui.json`, import.meta.url), JSON.stringify(scenarioMessages(scenario.id), null, 2) + '\n');
await writeFile(new URL('../catalogs/workspace-v1.json', import.meta.url), JSON.stringify(catalogSchema, null, 2) + '\n');
console.log('Exported three A2UI examples and the workspace catalog.');
