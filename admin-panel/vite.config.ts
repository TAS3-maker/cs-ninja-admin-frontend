import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: '/api/admin-ui/',
  build: { outDir: 'dist', sourcemap: false },
});
