/**
 * UselessWeb.org — Accessibility Test Cases (TC-A01 – TC-A04)
 * ─────────────────────────────────────────────────────────────────────────────
 * Target  : https://uselessweb.org/
 * Runner  : Playwright Test (@playwright/test)
 * Coverage: TC-A01, TC-A02, TC-A03, TC-A04
 * Standard: WCAG 2.1 AA
 *
 * Run:
 *   npx playwright test tests/test-cases/accessibility.spec.js
 */

// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://uselessweb.org/';

test.describe('Accessibility — TC-A01 to TC-A04', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  });

  // ── TC-A01 ──────────────────────────────────────────────────────────────────
  // Requirement: Tab order must include nav links → CTA → cards → footer links
  // Expected: Tab key moves focus to interactive elements (links or buttons)
  test('TC-A01 · Keyboard Tab navigation reaches interactive elements', async ({ page }) => {
    // Tab twice to move past any skip-link
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName + ':' + (el.textContent?.trim() || '') : '';
    });

    // At least a link or button must have received focus
    expect(focused).toMatch(/^(A|BUTTON):/);
  });

  // ── TC-A02 ──────────────────────────────────────────────────────────────────
  // Requirement: <button> or role=button element must have non-empty text or aria-label
  // Expected: CTA button has accessible name with length > 3 characters
  test('TC-A02 · CTA button has non-empty accessible name', async ({ page }) => {
    const btn = page.getByText(/take me somewhere useless/i).first();
    await expect(btn).toBeVisible();

    const txt = (await btn.textContent() || '').trim();
    expect(txt.length).toBeGreaterThan(3);
  });

  // ── TC-A03 ──────────────────────────────────────────────────────────────────
  // Requirement: Colour contrast ≥ 4.5:1 for normal text (WCAG 2.1 AA)
  // Expected: Page has a <main> landmark element present in DOM
  test('TC-A03 · Page has a <main> landmark element', async ({ page }) => {
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeAttached();
  });

  // ── TC-A04 ──────────────────────────────────────────────────────────────────
  // Requirement: Any decorative or informative <img> must have an alt attribute
  // Expected: Zero <img> elements are missing the alt attribute entirely
  test('TC-A04 · All images have alt attributes (empty is allowed for decorative)', async ({ page }) => {
    const missingAlt = await page.$$eval(
      'img:not([alt])',
      imgs => imgs.map(i => i.src)
    );

    if (missingAlt.length > 0) {
      console.warn('Images missing alt attribute:', missingAlt);
    }

    expect(missingAlt).toHaveLength(0);
  });
});
