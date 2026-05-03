/**
 * UselessWeb.org — Mobile Viewport Test Cases (TC-M01 – TC-M05)
 * ─────────────────────────────────────────────────────────────────────────────
 * Target  : https://uselessweb.org/
 * Runner  : Playwright Test (@playwright/test)
 * Coverage: TC-M01, TC-M02, TC-M03, TC-M04, TC-M05
 *
 * Run:
 *   npx playwright test tests/test-cases/mobile.spec.js
 */

// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://uselessweb.org/';

test.describe('Mobile Viewport — TC-M01 to TC-M05', () => {
  // ── TC-M01 ──────────────────────────────────────────────────────────────────
  // Priority: Medium
  // Pre-conditions: Portrait viewport 390×844
  // Steps: 1. Navigate to URL 2. Check for horizontal overflow 3. Verify CTA visible
  // Expected: Content reflows without horizontal overflow; CTA visible
  test('TC-M01 · Portrait 390×844 — no horizontal overflow', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);

    await expect(page.getByText(/take me somewhere useless/i).first()).toBeVisible();
    await ctx.close();
  });

  // ── TC-M02 ──────────────────────────────────────────────────────────────────
  // Priority: High
  // Pre-conditions: Mobile viewport 390×844
  // Steps: 1. Load page 2. Measure CTA button bounding box
  // Expected: Touch target width ≥ 44 px AND height ≥ 44 px
  test('TC-M02 · CTA touch target ≥ 44×44 px on 390px viewport', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const btn = page.getByText(/take me somewhere useless/i).first();
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await ctx.close();
  });

  // ── TC-M03 ──────────────────────────────────────────────────────────────────
  // Priority: High
  // Pre-conditions: Any viewport
  // Steps: 1. Read meta[name="viewport"] content attribute
  // Expected: Neither "user-scalable=no" nor "maximum-scale=1" is present (WCAG pinch-zoom)
  test('TC-M03 · Meta viewport does not disable user scaling (pinch-to-zoom)', async ({ page }) => {
    await page.goto(BASE_URL);

    const metaContent = await page.$eval(
      'meta[name="viewport"]',
      el => el.getAttribute('content') || ''
    ).catch(() => '');

    expect(metaContent.toLowerCase()).not.toMatch(/user-scalable\s*=\s*no/);
    expect(metaContent.toLowerCase()).not.toMatch(/maximum-scale\s*=\s*1[^0-9]/);
  });

  // ── TC-M04 ──────────────────────────────────────────────────────────────────
  // Priority: Medium
  // Pre-conditions: Small screen 320×568
  // Steps: 1. Load page 2. Verify CTA button is visible and positioned below viewport top
  // Expected: CTA button does not render above the visible area (y > 0)
  test('TC-M04 · Small screen 320px — CTA button does not overlap header', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 320, height: 568 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/take me somewhere useless/i).first()).toBeVisible();

    const box = await page.getByText(/take me somewhere useless/i).first().boundingBox();
    expect(box).not.toBeNull();
    expect(box.y).toBeGreaterThan(0);
    await ctx.close();
  });

  // ── TC-M05 ──────────────────────────────────────────────────────────────────
  // Priority: Medium
  // Pre-conditions: Landscape viewport 844×390 (portrait → landscape rotation simulation)
  // Steps: 1. Load page in landscape 2. Check title and horizontal overflow
  // Expected: Page renders correctly; no horizontal overflow in landscape mode
  test('TC-M05 · Landscape 844×390 — page still usable with no overflow', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/useless web/i);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);
    await ctx.close();
  });
});
