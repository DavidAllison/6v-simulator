import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages deployment configuration
  base: process.env.GITHUB_ACTIONS ? '/6v-simulator/' : '/',
});
