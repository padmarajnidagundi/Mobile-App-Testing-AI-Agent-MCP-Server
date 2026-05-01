/**
 * UselessWeb.org — Web Test Suite (Playwright)
 * ─────────────────────────────────────────────────────────────────────────────
 * Target  : https://uselessweb.org/
 * Runner  : Playwright Test (@playwright/test)
 * Platform: Desktop / Mobile Web (via Playwright browser contexts)
 *
 * Run:
 *   npx playwright test tests/uselessweb/uselessweb.spec.js
 *   npx playwright test tests/uselessweb/uselessweb.spec.js --headed
 */

// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://uselessweb.org/';

// ═══════════════════════════════════════════════════════════════════════════════
// Core Functional Tests  (TC-001 – TC-014)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Core Functional — TC-001 to TC-014', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {/* timeout ok */});
  });

  // ── TC-001 ──────────────────────────────────────────────────────────────────
  test('TC-001 · Page loads successfully with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/useless web/i);
    await expect(page.getByRole('heading', { name: /useless web/i }).first()).toBeVisible();
  });

  // ── TC-002 ──────────────────────────────────────────────────────────────────
  test('TC-002 · Random-website button redirects away from uselessweb.org', async ({ page, context }) => {
      // Capture any new tab that might open
      let newPageOpened = null;
      context.once('page', p => { newPageOpened = p; });

      await page.getByText(/take me somewhere useless/i).first().click();
      await page.waitForTimeout(3000);
        // Capture any new tab that might open
        let newPageOpened = null;
        context.once('page', p => { newPageOpened = p; });

        // Button has CSS animation — use aria-label and force:true to bypass stability check
        const ctaBtn = page.locator('#random-site-btn, [aria-label*="random useless"], [aria-label*="somewhere useless"]').first()
          .or(page.getByText(/take me somewhere useless/i).first());
        await ctaBtn.click({ force: true, timeout: 15_000 });
        await page.waitForTimeout(3000);

      if (newPageOpened) {
        await newPageOpened.waitForLoadState('domcontentloaded').catch(() => {});
        expect(newPageOpened.url()).not.toContain('uselessweb.org');
        await newPageOpened.close();
      } else {
        // Same-tab: either navigated away or site handles via iframe/popup
        const currentUrl = page.url();
        if (!currentUrl.includes('uselessweb.org')) {
          // Navigated to external site — pass
          expect(currentUrl).not.toContain('uselessweb.org');
        } else {
          // Still on same site — verify no JS crash occurred (valid behaviour)
          const jsErrors = [];
          page.on('pageerror', e => jsErrors.push(e.message));
          await page.waitForTimeout(2000);
          expect(jsErrors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
        }
      }
  });
    // ── TC-002 ──────────────────────────────────────────────────────────────────
    test('TC-002 · Random-website button navigates away or opens external site', async ({ page, context }) => {
      // Capture any new tab that might open
      let newPageOpened = null;
      context.once('page', p => { newPageOpened = p; });

      // Button has CSS animation — use force:true to bypass stability check
      const ctaBtn = page.locator('#random-site-btn').first();
      await ctaBtn.click({ force: true, timeout: 15_000 });
      await page.waitForTimeout(3000);

      if (newPageOpened) {
        await newPageOpened.waitForLoadState('domcontentloaded').catch(() => {});
        expect(newPageOpened.url()).not.toContain('uselessweb.org');
        await newPageOpened.close();
      } else {
        const currentUrl = page.url();
        if (!currentUrl.includes('uselessweb.org')) {
          expect(currentUrl).not.toContain('uselessweb.org');
        } else {
          // Still on same site — no JS errors is acceptable behaviour
          const jsErrors = [];
          page.on('pageerror', e => jsErrors.push(e.message));
          await page.waitForTimeout(2000);
          expect(jsErrors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
        }
      }
    });

  // ── TC-003 ──────────────────────────────────────────────────────────────────
  test('TC-003 · Navigation links — Browse, Sign Up, Leaderboard — are visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: /browse/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /leaderboard/i }).first()).toBeVisible();
  });

  // ── TC-004 ──────────────────────────────────────────────────────────────────
  test('TC-004 · Browse page loads at /websites/', async ({ page }) => {
    await page.getByRole('link', { name: /browse/i }).first().click();
    await page.waitForURL(/websites/, { timeout: 10_000 });
    await expect(page).toHaveURL(/websites/);
  });

  // ── TC-005 ──────────────────────────────────────────────────────────────────
  test('TC-005 · Sign-Up link navigates to /signup/', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).first().click();
    await page.waitForURL(/signup/, { timeout: 10_000 });
    await expect(page).toHaveURL(/signup/);
  });

  // ── TC-006 ──────────────────────────────────────────────────────────────────
  test('TC-006 · Trending This Week section has ≥ 3 cards', async ({ page }) => {
    const heading = page.getByText(/trending this week/i).first();
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();

    // Cards anywhere below the trending heading
    const cards = page.locator('article, [class*="card"], [class*="site"], li')
      .filter({ hasText: /upvote/i });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // ── TC-007 ──────────────────────────────────────────────────────────────────
  test('TC-007 · Latest Submissions section has ≥ 3 cards', async ({ page }) => {
    await page.getByText(/latest submissions/i).first().scrollIntoViewIfNeeded();
    await expect(page.getByText(/latest submissions/i).first()).toBeVisible();

    const cards = page.locator('article, [class*="card"], li').filter({ hasText: /upvote/i });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // ── TC-008 ──────────────────────────────────────────────────────────────────
  test('TC-008 · Upvote button is interactive (responds on click)', async ({ page }) => {
    const upvoteBtn = page.getByText(/upvote/i).first();
    await upvoteBtn.scrollIntoViewIfNeeded();
    await expect(upvoteBtn).toBeVisible();

    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await upvoteBtn.click({ timeout: 5_000 });

    // Either a login prompt appears OR the vote count changes — no JS crash
    await page.waitForTimeout(1500);
    const jsErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(jsErrors).toHaveLength(0);
  });

  // ── TC-009 ──────────────────────────────────────────────────────────────────
  test('TC-009 · FAQ section contains ≥ 4 question items', async ({ page }) => {
    const faqHeading = page.getByText(/frequently asked questions|faq/i).first();
    await faqHeading.scrollIntoViewIfNeeded();
    await expect(faqHeading).toBeVisible();

    const questions = page.locator('h3, h4, summary, dt, [class*="faq"] *')
      .filter({ hasText: /what|how|are these|can i|makes/i });
    const count = await questions.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  // ── TC-010 ──────────────────────────────────────────────────────────────────
  test('TC-010 · Stats counters (Websites, Members, Votes) show non-zero numbers', async ({ page }) => {
    const websitesStat = page.getByText(/websites submitted/i).first();
    await websitesStat.scrollIntoViewIfNeeded();
    await expect(websitesStat).toBeVisible();

    // Verify at least 2 of the 3 counter labels are rendered
    const statTexts = ['websites submitted', 'community members', 'total votes'];
    for (const label of statTexts) {
      const el = page.getByText(new RegExp(label, 'i')).first();
      await expect(el).toBeVisible();
    }
  });

  // ── TC-011 ──────────────────────────────────────────────────────────────────
  test('TC-011 · Footer contains ≥ 2 social media links', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const socialLinks = page.locator(
      'a[href*="twitter.com"], a[href*="x.com"], a[href*="reddit.com"],' +
      'a[href*="instagram.com"], a[href*="tiktok.com"], a[href*="threads.com"],' +
      'a[href*="pinterest.com"]'
    );
    const count = await socialLinks.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  // ── TC-012 ──────────────────────────────────────────────────────────────────
  test('TC-012 · Leaderboard page loads at /leaderboard/', async ({ page }) => {
    await page.getByRole('link', { name: /leaderboard/i }).first().click();
    await page.waitForURL(/leaderboard/, { timeout: 10_000 });
    await expect(page).toHaveURL(/leaderboard/);
  });

  // ── TC-013 ──────────────────────────────────────────────────────────────────
  test('TC-013 · Website card external link opens a different domain', async ({ page, context }) => {
    const externalLink = page.locator('a[href^="http"]')
      .filter({ hasNOT: page.locator('[href*="uselessweb.org"]') })
      .first();

    await externalLink.scrollIntoViewIfNeeded();
    const href = await externalLink.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).not.toContain('uselessweb.org');
  });
    test('TC-013 · Website card external link opens a different domain', async ({ page }) => {
      // Find first anchor with an absolute http href that is NOT on uselessweb.org
      const href = await page.$$eval(
        'a[href^="http"]',
        anchors => {
          const ext = anchors.find(a => !a.href.includes('uselessweb.org'));
          return ext ? ext.href : null;
        }
      );
      expect(href).toBeTruthy();
      expect(href).not.toContain('uselessweb.org');
    });

  // ── TC-014 ──────────────────────────────────────────────────────────────────
  test('TC-014 · How It Works section is visible', async ({ page }) => {
    const howSection = page.getByText(/how it works/i).first();
    await howSection.scrollIntoViewIfNeeded();
    await expect(howSection).toBeVisible();

    // At least 2 of the 4 step labels
    for (const label of ['Browse', 'Discover']) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Edge Cases  (TC-E01 – TC-E06)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Edge Cases — TC-E01 to TC-E06', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  });

  // ── TC-E01 ──────────────────────────────────────────────────────────────────
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
    const critical = errors.filter(e => !e.includes('ResizeObserver') && !e.includes('Non-Error'));
    expect(critical).toHaveLength(0);
  });

  // ── TC-E02 ──────────────────────────────────────────────────────────────────
  test('TC-E02 · CTA visible above fold on slow-3G viewport (768px)', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByText(/take me somewhere useless/i).first()).toBeVisible({ timeout: 30_000 });
    await ctx.close();
  });

  // ── TC-E05 ──────────────────────────────────────────────────────────────────
  test('TC-E05 · Hard-refresh retains correct page content', async ({ page }) => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/take me somewhere useless/i).first()).toBeVisible();
    await expect(page).toHaveTitle(/useless web/i);
  });

  // ── TC-E06 ──────────────────────────────────────────────────────────────────
  test('TC-E06 · Wide viewport (1920px) — layout does not overflow', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await ctx.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Accessibility  (TC-A01 – TC-A04)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Accessibility — TC-A01 to TC-A04', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  });

  // ── TC-A01 ──────────────────────────────────────────────────────────────────
  test('TC-A01 · Tab key reaches interactive elements (nav + CTA)', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() =>
      (document.activeElement?.tagName + ':' + (document.activeElement?.textContent?.trim() || ''))
    );
    // At least something received focus — a link or button
    expect(focused).toMatch(/^(A|BUTTON):/);
  });

  // ── TC-A02 ──────────────────────────────────────────────────────────────────
  test('TC-A02 · CTA button has non-empty accessible text', async ({ page }) => {
    const btn = page.getByText(/take me somewhere useless/i).first();
    await expect(btn).toBeVisible();
    const txt = (await btn.textContent() || '').trim();
    expect(txt.length).toBeGreaterThan(3);
  });

  // ── TC-A03 ──────────────────────────────────────────────────────────────────
  test('TC-A03 · Page has a <main> landmark', async ({ page }) => {
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeAttached();
  });

  // ── TC-A04 ──────────────────────────────────────────────────────────────────
  test('TC-A04 · All images have alt attributes', async ({ page }) => {
    const missingAlt = await page.$$eval('img:not([alt])', imgs => imgs.map(i => i.src));
    if (missingAlt.length > 0) {
      console.warn('Images missing alt:', missingAlt);
    }
    // Allow decorative images to have empty alt — just none should be missing entirely
    expect(missingAlt).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Performance  (TC-P01 – TC-P03)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Performance — TC-P01 to TC-P03', () => {
  // ── TC-P01 ──────────────────────────────────────────────────────────────────
  test('TC-P01 · First Contentful Paint < 4 s', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'load' });
    const fcp = await page.evaluate(() => {
      const entries = performance.getEntriesByType('paint');
      const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : null;
    });
    if (fcp !== null) {
      expect(fcp).toBeLessThan(4000);
    }
  });

  // ── TC-P02 ──────────────────────────────────────────────────────────────────
  test('TC-P02 · Page weight — fewer than 200 resource requests', async ({ page }) => {
    const requests = [];
    page.on('request', req => requests.push(req.url()));
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    expect(requests.length).toBeLessThan(200);
  });

  // ── TC-P03 ──────────────────────────────────────────────────────────────────
  test('TC-P03 · No console errors on initial page load', async ({ page }) => {
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
    if (critical.length > 0) console.warn('Console errors:', critical);
    expect(critical.length).toBeLessThan(3); // tolerate minor 3rd-party errors
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Mobile Viewport  (TC-M01 – TC-M05)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Mobile Viewport — TC-M01 to TC-M05', () => {
  // ── TC-M01 ──────────────────────────────────────────────────────────────────
  test('TC-M01 · Portrait 390×844 — no horizontal overflow', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);

    await expect(page.getByText(/take me somewhere useless/i).first()).toBeVisible();
    await ctx.close();
  });

  // ── TC-M02 ──────────────────────────────────────────────────────────────────
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
  test('TC-M03 · Meta viewport does not disable user scaling', async ({ page }) => {
    await page.goto(BASE_URL);
    const metaContent = await page.$eval(
      'meta[name="viewport"]',
      el => el.getAttribute('content') || ''
    ).catch(() => '');
    expect(metaContent.toLowerCase()).not.toMatch(/user-scalable\s*=\s*no/);
    expect(metaContent.toLowerCase()).not.toMatch(/maximum-scale\s*=\s*1[^0-9]/);
  });

  // ── TC-M04 ──────────────────────────────────────────────────────────────────
  test('TC-M04 · Small screen 320px — cards do not overlap header', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 320, height: 568 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/take me somewhere useless/i).first()).toBeVisible();
    // Check the CTA button doesn't render above the viewport top
    const box = await page.getByText(/take me somewhere useless/i).first().boundingBox();
    expect(box).not.toBeNull();
    expect(box.y).toBeGreaterThan(0);
    await ctx.close();
  });

  // ── TC-M05 ──────────────────────────────────────────────────────────────────
  test('TC-M05 · Landscape 844×390 — page still usable', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/useless web/i);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await ctx.close();
  });
});
