import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { transform as esbuildTransform } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const rootDir = import.meta.dirname;

export default defineConfig(({ mode, isSsrBuild }) => {
  const isProd = mode === 'production';
  const explicitBackend = process.env.VITE_BACKEND?.trim();

  return {
    define: explicitBackend
      ? { 'import.meta.env.VITE_BACKEND': JSON.stringify(explicitBackend) }
      : undefined,
    plugins: [
      react(),
      tailwindcss(),
      // Strip console.* and debugger statements from client production chunks
      isProd && !isSsrBuild
        ? {
            name: 'strip-prod-console-debugger',
            apply: 'build',
            async renderChunk(code: string) {
              const res = await esbuildTransform(code, {
                minify: true,
                drop: ['console', 'debugger'],
                legalComments: 'none',
                target: 'es2020',
              });
              return { code: res.code, map: null };
            },
          }
        : undefined,
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." still resolve in production builds.
      !isSsrBuild
        ? {
            name: 'copy-unbundled-src-assets',
            apply: 'build',
            closeBundle(error?: Error): void {
              if (error) {
                return;
              }
              const distDir = path.resolve(rootDir, 'dist');
              const srcAssets = path.resolve(rootDir, 'src/assets');
              const distAssets = path.resolve(distDir, 'src/assets');
              if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
                fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
              }
            },
          }
        : undefined,
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    build: {
      sourcemap: false,
      target: 'es2020',
      chunkSizeWarningLimit: 200,
      rolldownOptions: isSsrBuild
        ? undefined
        : {
            output: {
              manualChunks(id) {
                if (
                  id.includes('node_modules/react/') ||
                  id.includes('node_modules/react-dom/') ||
                  id.includes('node_modules/react-router')
                ) {
                  return 'vendor-react';
                }
                if (id.includes('node_modules/motion')) {
                  return 'vendor-motion';
                }
                if (id.includes('node_modules/@tanstack/react-query')) {
                  return 'vendor-query';
                }
                if (id.includes('node_modules/@supabase')) {
                  return 'vendor-supabase';
                }
                if (id.includes('node_modules/zod') || id.includes('node_modules/dompurify')) {
                  return 'vendor-security';
                }
                return undefined;
              },
            },
          },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
