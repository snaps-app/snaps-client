import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SnapsClient',
      formats: ['umd', 'es'],
      fileName: (format) => `snaps-client.${format}.js`,
    },
    rollupOptions: {
      // React is bundled internally — no externals
    },
    cssCodeSplit: false, // Single CSS file
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
