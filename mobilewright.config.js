// mobilewright.config.js
// ─────────────────────────────────────────────────────────────────────────────
// Mobilewright configuration for Mobile-App-Testing-AI-Agent-MCP-Server
// Docs: https://github.com/mobile-next/mobilewright#configuration

const { defineConfig } = require('mobilewright');

module.exports = defineConfig({
  // Default test directory
  testDir: './tests',

  // Match both Mobilewright test files and generated specs
  testMatch: ['**/*.test.js', '**/*.spec.js'],

  // Global locator timeout (ms)
  timeout: 30_000,

  // Reporter — use 'list' for CI, 'html' for local runs
  reporter: process.env.CI ? 'list' : ['list', 'html'],

  // Retry flaky tests once in CI
  retries: process.env.CI ? 1 : 0,

  // Multi-platform project matrix
  projects: [
    {
      name: 'web-chrome',
      platform: 'web',       // pseudo-platform for Playwright-only specs
      testMatch: ['**/uselessweb.spec.js', '**/generated/*-web-*.spec.js'],
    },
    {
      name: 'android',
      platform: 'android',
      testMatch: ['**/*android*.test.js', '**/generated/*-android-*.test.js'],
      // Device options — override per-test with test.use({ deviceName: /.../ })
      // deviceName: /Pixel/,
    },
    {
      name: 'ios',
      platform: 'ios',
      testMatch: ['**/*ios*.test.js', '**/generated/*-ios-*.test.js'],
      // deviceName: /iPhone 16/,
    },
  ],
});
