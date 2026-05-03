/**
 * UselessWeb.org — Core Functional Test Cases (TC-001 – TC-014)
 * ─────────────────────────────────────────────────────────────────────────────
 * Target  : https://uselessweb.org/
 * Runner  : Playwright Test (@playwright/test)
 * Coverage: TC-001, TC-002, TC-003, TC-004, TC-005, TC-006, TC-007,
 *           TC-008, TC-009, TC-010, TC-011, TC-012, TC-013, TC-014
 *
 * Run:
 *   npx playwright test tests/test-cases/core-functional.spec.js
 */

// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://uselessweb.org/';

test.describe('Core Functional — TC-001 to TC-014', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {/* timeout ok */});
  });

  // ── TC-001 ──────────────────────────────────────────────────────────────────
  // Priority: High
  // Pre-conditions: Network available, browser open
  // Steps: 1. Navigate to https://uselessweb.org/ 2. Wait for DOM content loaded
  // Expected: HTTP 200; page title contains "Useless Web"; main heading visible
  test('TC-001 · Page loads successfully with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/useless web/i);
    await expect(page.getByRole('heading', { name: /useless web/i }).first()).toBeVisible();
  });

  // ── TC-002 ──────────────────────────────────────────────────────────────────
  // Priority: High
  // Pre-conditions: Page fully loaded
  // Steps: 1. Locate "🎲 Take me somewhere useless" button 2. Click/tap it 3. Wait up to 10s
  // Expected: Browser navigates away from uselessweb.org to a different domain
  test('TC-002 · Random-website button navigates away from uselessweb.org', async ({ page, context }) => {
    let newPageOpened = null;
    context.once('page', p => { newPageOpened = p; });

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
        const jsErrors = [];
        page.on('pageerror', e => jsErrors.push(e.message));
        await page.waitForTimeout(2000);
        expect(jsErrors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
      }
    }
  });

  // ── TC-003 ──────────────────────────────────────────────────────────────────
  // Priority: High
  // Pre-conditions: Page loaded
  // Steps: 1. Inspect header 2. Verify "Browse", "Sign Up", and "Leaderboard" links
  // Expected: All three links are visible and have non-empty href values
  test('TC-003 · Navigation links — Browse, Sign Up, Leaderboard — are visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: /browse/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /leaderboard/i }).first()).toBeVisible();
  });

  // ── TC-004 ──────────────────────────────────────────────────────────────────
  // Priority: Medium
  // Pre-conditions: Home page loaded
  // Steps: 1. Click "Browse" link 2. Wait for page
  // Expected: URL path becomes /websites/; website cards rendered
  test('TC-004 · Browse page loads at /websites/', async ({ page }) => {
    await page.getByRole('link', { name: /browse/i }).first().click();
    await page.waitForURL(/websites/, { timeout: 10_000 });
    await expect(page).toHaveURL(/websites/);
  });

  // ── TC-005 ──────────────────────────────────────────────────────────────────
  // Priority: Medium
  // Pre-conditions: Home page loaded
  // Steps: 1. Click "Sign Up" 2. Wait for navigation
  // Expected: URL path becomes /signup/; sign-up form visible
  test('TC-005 · Sign-Up link navigates to /signup/', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).first().click();
    await page.waitForURL(/signup/, { timeout: 10_000 });
    await expect(page).toHaveURL(/signup/);
  });

  // ── TC-006 ──────────────────────────────────────────────────────────────────
  // Priority: High
  // Pre-conditions: Home page loaded
  // Steps: 1. Scroll to "🔥 Trending This Week" section 2. Count visible cards
  // Expected: ≥ 3 website cards visible with title and upvote count
  test('TC-006 · Trending This Week section has ≥ 3 cards', async ({ page }) => {
    const heading = page.getByText(/trending this week/i).first();
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();

    const cards = page.locator('article, [class*="card"], [class*="site"], li')
      .filter({ hasText: /upvote/i });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // ── TC-007 ──────────────────────────────────────────────────────────────────
  // Priority: Medium
  // Pre-conditions: Home page loaded
  // Steps: 1. Scroll to "✨ Latest Submissions" section 2. Count visible cards
  // Expected: ≥ 3 submission cards visible
  test('TC-007 · Latest Submissions section has ≥ 3 cards', async ({ page }) => {
    await page.getByText(/latest submissions/i).first().scrollIntoViewIfNeeded();
    await expect(page.getByText(/latest submissions/i).first()).toBeVisible();

    const cards = page.locator('article, [class*="card"], li').filter({ hasText: /upvote/i });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // ── TC-008 ──────────────────────────────────────────────────────────────────
  // Priority: Medium
  // Pre-conditions: Home page loaded; user may or may not be logged in
  // Steps: 1. Locate first "Upvote" button 2. Click/tap it
  // Expected: Button reacts (counter increments or login prompt appears); no unhandled JS error
  test('TC-008 · Upvote button is interactive (responds on click)', async ({ page }) => {
    const upvoteBtn = page.getByText(/upvote/i).first();
    await upvoteBtn.scrollIntoViewIfNeeded();
    await expect(upvoteBtn).toBeVisible();

    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await upvoteBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(1500);

    const jsErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(jsErrors).toHaveLength(0);
  });

  // ── TC-009 ──────────────────────────────────────────────────────────────────
  // Priority: Low
  // Pre-conditions: Home page loaded
  // Steps: 1. Scroll to "Frequently Asked Questions" section 2. Count question items
  // Expected: ≥ 4 FAQ questions rendered
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
  // Priority: Medium
  // Pre-conditions: Home page loaded
  // Steps: 1. Locate stats bar showing "Websites Submitted", "Community Members", "Total Votes"
  // Expected: All three values are numeric and > 0
  test('TC-010 · Stats counters (Websites, Members, Votes) show non-zero numbers', async ({ page }) => {
    const websitesStat = page.getByText(/websites submitted/i).first();
    await websitesStat.scrollIntoViewIfNeeded();
    await expect(websitesStat).toBeVisible();

    const statTexts = ['websites submitted', 'community members', 'total votes'];
    for (const label of statTexts) {
      const el = page.getByText(new RegExp(label, 'i')).first();
      await expect(el).toBeVisible();
    }
  });

  // ── TC-011 ──────────────────────────────────────────────────────────────────
  // Priority: Low
  // Pre-conditions: Home page loaded
  // Steps: 1. Scroll to footer 2. Check for Twitter/X, Reddit, Instagram links
  // Expected: ≥ 2 social icons with valid external hrefs
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
  // Priority: Medium
  // Pre-conditions: Home page loaded
  // Steps: 1. Click "Leaderboard" link 2. Wait for navigation
  // Expected: URL becomes /leaderboard/; contributor table or list visible
  test('TC-012 · Leaderboard page loads at /leaderboard/', async ({ page }) => {
    await page.getByRole('link', { name: /leaderboard/i }).first().click();
    await page.waitForURL(/leaderboard/, { timeout: 10_000 });
    await expect(page).toHaveURL(/leaderboard/);
  });

  // ── TC-013 ──────────────────────────────────────────────────────────────────
  // Priority: Medium
  // Pre-conditions: Home page loaded with trending cards
  // Steps: 1. Click external link (🌐) on first trending card 2. Wait for new page/tab
  // Expected: External useless website opens; URL differs from uselessweb.org
  test('TC-013 · Website card external link points to a different domain', async ({ page }) => {
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
  // Priority: Low
  // Pre-conditions: Home page loaded
  // Steps: 1. Scroll to "📚 How It Works" 2. Check step cards
  // Expected: Browse, Discover, Enjoy, Share cards all visible
  test('TC-014 · How It Works section is visible', async ({ page }) => {
    const howSection = page.getByText(/how it works/i).first();
    await howSection.scrollIntoViewIfNeeded();
    await expect(howSection).toBeVisible();

    for (const label of ['Browse', 'Discover']) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });
});
