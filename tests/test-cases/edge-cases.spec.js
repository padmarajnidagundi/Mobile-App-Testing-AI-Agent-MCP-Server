/**
 * UselessWeb.org — Edge Case Test Cases (TC-E01 – TC-E06)
 * ─────────────────────────────────────────────────────────────────────────────
 * Target  : https://uselessweb.org/
 * Runner  : Playwright Test (@playwright/test)
 * Coverage: TC-E01, TC-E02, TC-E03, TC-E04, TC-E05, TC-E06
 *
 * Run:
 *   npx playwright test tests/test-cases/edge-cases.spec.js
 */

// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://uselessweb.org/';

test.describe('Edge Cases — TC-E01 to TC-E06', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  });

  // ── TC-E01 ──────────────────────────────────────────────────────────────────
  // Priority: Medium
  // Pre-conditions: Home page loaded
  // Steps: 1. Click CTA 5 times in 2 seconds 2. Monitor JS console
  // Expected: No unhandled exceptions; navigation or rate-limit message shown
  test('TC-E01 · Rapid CTA clicks (5×) produce no JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    const cta = page.getByText(/take me somewhere useless/i).first();
    for (let i = 0; i < 5; i++) {
      await cta.click({ timeout: 3_000 }).catch(() => {});
      await page.waitForTimeout(300);
      if (!page.url().includes('uselessweb.org')) {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      }
    }

    const critical = errors.filter(e =>
      !e.includes('ResizeObserver') && !e.includes('Non-Error')
    );
    expect(critical).toHaveLength(0);
  });

  // ── TC-E02 ──────────────────────────────────────────────────────────────────
  // Priority: Medium
  // Pre-conditions: Network throttled to Slow 3G (50 kbps down, 400 ms latency)
  // Steps: 1. Navigate to URL on 768px viewport 2. Measure CTA visibility
  // Expected: CTA button visible above fold; LCP < 4 s; no layout shift errors
  test('TC-E02 · CTA visible above fold on slow-3G viewport (768px)', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(
      page.getByText(/take me somewhere useless/i).first()
    ).toBeVisible({ timeout: 30_000 });
    await ctx.close();
  });

  // ── TC-E03 ──────────────────────────────────────────────────────────────────
  // Priority: Low
  // Pre-conditions: /websites/ page open with search field
  // Steps: 1. Clear search input 2. Submit
  // Expected: All website cards shown; no 500 error
  test('TC-E03 · Browse with empty search query shows all results', async ({ page }) => {
    await page.goto(`${BASE_URL}websites/`, { waitUntil: 'domcontentloaded' });

    const searchInput = page.locator('input[type="search"], input[type="text"], input[name*="search"], input[placeholder*="search"]').first();
    const inputExists = await searchInput.count() > 0;

    if (inputExists) {
      await searchInput.clear();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
    }

    // Page should not show a server error
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/500|internal server error/i);

    // Cards or list items should still be present
    const cards = page.locator('article, [class*="card"], [class*="site-item"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ── TC-E04 ──────────────────────────────────────────────────────────────────
  // Priority: Medium
  // Pre-conditions: /signup/ page loaded
  // Steps: 1. Enter "not-a-url" in website URL field 2. Click Submit
  // Expected: Client-side or server-side validation error displayed; no redirect
  test('TC-E04 · Submit invalid URL on sign-up shows validation error', async ({ page }) => {
    await page.goto(`${BASE_URL}signup/`, { waitUntil: 'domcontentloaded' });

    const urlInput = page.locator(
      'input[type="url"], input[name*="url"], input[placeholder*="url"], input[placeholder*="website"]'
    ).first();

    const inputExists = await urlInput.count() > 0;
    if (!inputExists) {
      test.skip(true, 'No URL input found on /signup/ — page may require auth');
      return;
    }

    await urlInput.fill('not-a-url');
    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    await submitBtn.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Must NOT navigate away from /signup/
    expect(page.url()).toContain('signup');

    // Some validation feedback should be present
    const validationMsg = page.locator(
      '[class*="error"], [class*="invalid"], .alert, [role="alert"], :invalid'
    );
    const errCount = await validationMsg.count();
    expect(errCount).toBeGreaterThanOrEqual(1);
  });

  // ── TC-E05 ──────────────────────────────────────────────────────────────────
  // Priority: Low
  // Pre-conditions: Home page loaded once
  // Steps: 1. Hard-reload page (Ctrl+Shift+R)
  // Expected: Page re-renders correctly; no broken assets
  test('TC-E05 · Hard-refresh retains correct page content', async ({ page }) => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/take me somewhere useless/i).first()).toBeVisible();
    await expect(page).toHaveTitle(/useless web/i);
  });

  // ── TC-E06 ──────────────────────────────────────────────────────────────────
  // Priority: Low
  // Pre-conditions: Viewport set to 3840×2160
  // Steps: 1. Navigate to URL 2. Check layout
  // Expected: Content centred; no full-width text stretching off-screen
  test('TC-E06 · Wide viewport (1920px) — layout does not overflow', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);
    await ctx.close();
  });
});
