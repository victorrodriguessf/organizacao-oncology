import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', testMatch: '*.spec.ts', use: { baseURL: 'http://127.0.0.1:3100', headless: true }, reporter: 'list', webServer: { command: 'npm run dev', env: { PORT: '3100', GUIDE_DATA_DIR: 'test-results/guide-store' }, url: 'http://127.0.0.1:3100/api/health', reuseExistingServer: false }, workers: 1 });
