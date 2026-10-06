import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createGeminiHandler } from './server/gemini.ts';

export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: 'local-gemini-agent',
    configureServer(server) {
      const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env } as Record<string, string>;
      const handler = createGeminiHandler(env);
      server.middlewares.use('/api/generate', (req, res) => { void handler(req, res); });
    },
  }],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
}));
