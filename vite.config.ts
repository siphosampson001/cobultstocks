import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Ignore database store files to prevent Vite dev server from triggering continuous page reloads when npm run dev is active.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/db_sim_store.json', '**/.data/**', '**/*.json', '**/node_modules/**']
      },
    },
  };
});
