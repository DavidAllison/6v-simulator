import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Content-Security-Policy for the deployed app. Notes on the allowances:
// - script-src 'self'         — the production build emits only external module
//                               scripts; there are no inline scripts.
// - style-src 'unsafe-inline' — React sets inline `style` attributes (theme
//                               variables, the pan/zoom transform), which require
//                               this. Style injection is far lower-risk than script.
// - worker-src 'self' blob:   — the Monte Carlo Web Worker (simulationWorker).
// - img-src data:             — defensive, for any canvas/data-URI image use.
// Header-only directives (frame-ancestors, HSTS, etc.) are NOT set here — they
// are ignored in a <meta> CSP and would emit a console warning. They belong in
// the CloudFront response-headers policy: see infrastructure/aws/.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// Inject the CSP <meta> into the built index.html only. Build-only so Vite's dev
// server (inline HMR scripts, eval, websocket) keeps working under `npm run dev`.
function cspMetaPlugin(): Plugin {
  return {
    name: 'inject-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cspMetaPlugin()],
  // Use root path for CloudFront/S3 deployment
  base: '/',
});
