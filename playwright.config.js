// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  webServer: {
    command: 'npx http-server . -p 4173 -c-1 --silent',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: true
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    headless: true
  }
});
