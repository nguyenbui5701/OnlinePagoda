import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({ root: resolve('apps/dashboard'), base: '/dashboard/', plugins: [react()], build: { outDir: resolve(process.env.APP_BUILD_DIRECTORY || 'dist', 'dashboard'), emptyOutDir: true } });
