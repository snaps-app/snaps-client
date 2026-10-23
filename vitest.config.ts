import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

// The provisioner can return an 8.3 Windows path; Vite resolves imports by realpath.
const root = realpathSync.native(process.cwd());

export default defineConfig({
  root,
  server: { fs: { allow: [root, process.cwd()] } },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: [resolve(root, 'tests/setup.ts')],
    restoreMocks: true,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
