import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dynamic base URL for different deployment targets
  base: process.env.VITE_BASE_URL ? '/' : process.env.GITHUB_ACTIONS ? '/6v-simulator/' : '/',
  define: {
    // Make environment variables available to the app
    'import.meta.env.VITE_IS_PR_PREVIEW': JSON.stringify(process.env.VITE_IS_PR_PREVIEW || 'false'),
    'import.meta.env.VITE_PR_NUMBER': JSON.stringify(process.env.VITE_PR_NUMBER || ''),
    'import.meta.env.VITE_BUILD_MODE': JSON.stringify(process.env.VITE_BUILD_MODE || 'development'),
  },
});
