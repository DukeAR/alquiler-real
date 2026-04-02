import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: [
      'src/**/*.{test,spec}.{ts,tsx,js,jsx}',
      'src/**/__tests__/**/*.{ts,tsx,js,jsx}',
      'server/**/*.{test,spec}.{ts,tsx,js,jsx}',
      'server/**/__tests__/**/*.{ts,tsx,js,jsx}',
    ],
    environmentMatchGlobs: [['server/**', 'node']],
  },
});
