import { defineConfig } from 'vitest/config';
import { realpathSync } from 'node:fs';
const root = realpathSync.native(process.cwd());
process.chdir(root);
export default defineConfig({ root, server: { fs: { allow: [root] } }, test: { environment: 'node', include: ['tests/browser/*.smoke.ts'], testTimeout: 60000, hookTimeout: 60000, pool: 'forks', maxWorkers: 1 } });
