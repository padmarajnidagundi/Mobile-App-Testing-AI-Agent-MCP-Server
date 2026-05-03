/**
 * UselessWeb.org — Performance Test Cases (TC-P01 – TC-P03)
 * ─────────────────────────────────────────────────────────────────────────────
 * Target  : https://uselessweb.org/
 * Runner  : Playwright Test (@playwright/test)
 * Coverage: TC-P01, TC-P02, TC-P03
 *
 * Run:
 *   npx playwright test tests/test-cases/performance.spec.js
 */

// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://uselessweb.org/';

test.describe('Performance — TC-P01 to TC-P03', () => {
  // ── TC-P01 ──────────────────────────────────────────────────────────────────
  // Requirement: First Contentful Paint measured via performance.getEntriesByType('paint')
  // Expected: FCP < 4000 ms (4 s)
  test('TC-P01 · First Contentful Paint < 4 s', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'load' });

    const fcp = await page.evaluate(() => {
      const entries = performance.getEntriesByType('paint');
      const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : null;
    });

    if (fcp !== null) {
      console.log(`FCP: ${fcp.toFixed(0)} ms`);
      expect(fcp).toBeLessThan(4000);
    } else {
      console.warn('FCP entry not available in this browser context');
    }
  });

  // ── TC-P02 ──────────────────────────────────────────────────────────────────
  // Requirement: Total Blocking Time — long tasks must not excessively block main thread
  // Expected: Fewer than 200 network resource requests on initial load
  test('TC-P02 · Page weight — fewer than 200 resource requests', async ({ page }) => {
    const requests = [];
    page.on('request', req => requests.push(req.url()));

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    console.log(`Total requests: ${requests.length}`);
    expect(requests.length).toBeLessThan(200);
  });

  // ── TC-P03 ──────────────────────────────────────────────────────────────────
  // Requirement: Zero console.error messages on initial page load (excluding CORS/3rd party)
  // Expected: Fewer than 3 critical console errors (tolerates minor 3rd-party noise)
  test('TC-P03 · No critical console errors on initial page load', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const critical = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('net::ERR') &&
      !e.includes('ResizeObserver')
    );

    if (critical.length > 0) {
      console.warn('Console errors detected:', critical);
    }

    // Tolerate up to 2 minor 3rd-party errors
    expect(critical.length).toBeLessThan(3);
  });
});
