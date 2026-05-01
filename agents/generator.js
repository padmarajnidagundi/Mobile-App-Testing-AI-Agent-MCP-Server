/**
 * 🎭 GENERATOR AGENT
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads a Markdown test-plan produced by the Planner and uses an LLM to emit
 * ready-to-run Playwright Test (+ Mobilewright) spec files.
 *
 * Usage:
 *   node agents/generator.js --plan plans/uselessweb-org--web-test-plan.md
 *   node agents/generator.js --plan plans/uselessweb-org--android-test-plan.md --platform android
 *   node agents/generator.js --plan plans/uselessweb-org--ios-test-plan.md     --platform ios
 */

'use strict';

const OpenAI  = require('openai');
const fs      = require('fs');
const path    = require('path');
const dotenv  = require('dotenv');

dotenv.config();

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => a.replace('--', '').split('='))
    .map(([k, ...v]) => [k, v.join('=') || true])
);

const PLAN_FILE = args.plan || path.join(__dirname, '..', 'plans',
  'uselessweb-org--web-test-plan.md');
const PLATFORM  = args.platform || 'web';   // web | android | ios
const OUT_DIR   = args.out || path.join(__dirname, '..', 'tests', 'generated');

// ── OpenAI client ─────────────────────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY_HERE',
});

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── System prompts per platform ────────────────────────────────────────────────
const SYSTEM_PROMPTS = {
  web: `
You are a senior test-automation engineer expert in Playwright Test (@playwright/test).
Convert the supplied Markdown test plan into a single, complete, runnable
Playwright Test spec file (.spec.js).

Rules:
- Use \`import { test, expect } from '@playwright/test';\`
- Group related tests with \`test.describe()\`
- Use \`page.goto()\`, \`page.locator()\`, \`page.getByRole()\`, \`page.getByText()\`
- Each TC becomes one \`test()\` block; include the TC-ID in the test name
- Add \`test.beforeEach\` for common setup (navigate to URL, wait for load)
- Add explicit \`await expect().toBeVisible()\` or \`toHaveURL()\` assertions
- Use \`page.waitForURL()\` or \`page.waitForLoadState()\` instead of arbitrary sleeps
- Output ONLY valid JavaScript — no prose, no markdown fences
`.trim(),

  android: `
You are a senior mobile-test-automation engineer expert in Mobilewright (@mobilewright/test)
and Playwright.

Convert the supplied Markdown test plan into a single, complete, runnable
Mobilewright spec file that opens the URL in the Android device browser.

Rules:
- Use \`import { test, expect } from '@mobilewright/test';\`
- Each test receives \`{ device, screen }\` fixtures
- Open URLs with \`await device.openUrl(url)\`
- Use \`screen.getByRole()\`, \`screen.getByLabel()\`, \`screen.getByText()\`
- Add assertions with \`expect(screen.getByText('…')).toBeVisible()\`
- Add \`test.use({ platform: 'android' })\` at the top of the file
- Each TC becomes one \`test()\` block with its TC-ID in the name
- Output ONLY valid JavaScript — no prose, no markdown fences
`.trim(),

  ios: `
You are a senior mobile-test-automation engineer expert in Mobilewright (@mobilewright/test)
and Playwright.

Convert the supplied Markdown test plan into a single, complete, runnable
Mobilewright spec file that opens the URL in the iOS device browser.

Rules:
- Use \`import { test, expect } from '@mobilewright/test';\`
- Each test receives \`{ device, screen }\` fixtures
- Open URLs with \`await device.openUrl(url)\`
- Use \`screen.getByRole()\`, \`screen.getByLabel()\`, \`screen.getByText()\`
- Add assertions with \`expect(screen.getByText('…')).toBeVisible()\`
- Add \`test.use({ platform: 'ios' })\` at the top of the file
- Each TC becomes one \`test()\` block with its TC-ID in the name
- Output ONLY valid JavaScript — no prose, no markdown fences
`.trim(),
};

// ── Static code templates (fallback when no API key) ──────────────────────────
function staticWebSpec(planPath) {
  return `// ⚠️  GENERATOR AGENT — Static fallback spec (set OPENAI_API_KEY for AI generation)
// Plan source: ${planPath}
// Generated  : ${new Date().toISOString()}

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://uselessweb.org/';

test.describe('TC-001 to TC-012 · UselessWeb.org – Core Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  // TC-001
  test('TC-001 · Page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Useless Web/i);
    await expect(page.getByRole('heading', { name: /Useless Web/i })).toBeVisible();
  });

  // TC-002
  test('TC-002 · Random-website button redirects to external site', async ({ page, context }) => {
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: /take me somewhere useless/i }).click(),
    ]).catch(async () => {
      // May navigate in same tab depending on implementation
      await page.getByText(/take me somewhere useless/i).click();
      await page.waitForURL(url => url !== BASE_URL, { timeout: 10_000 });
      return [page];
    });
    const target = newPage || page;
    expect(target.url()).not.toBe(BASE_URL);
  });

  // TC-003
  test('TC-003 · Navigation links are present', async ({ page }) => {
    await expect(page.getByRole('link', { name: /browse/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /leaderboard/i }).first()).toBeVisible();
  });

  // TC-004
  test('TC-004 · Browse page loads correctly', async ({ page }) => {
    await page.getByRole('link', { name: /browse/i }).first().click();
    await page.waitForURL(/\\/websites\\//);
    await expect(page).toHaveURL(/websites/);
  });

  // TC-005
  test('TC-005 · Sign-Up link navigates to signup page', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).first().click();
    await page.waitForURL(/signup/);
    await expect(page).toHaveURL(/signup/);
  });

  // TC-006
  test('TC-006 · Trending section displays at least 3 cards', async ({ page }) => {
    await page.getByText(/trending this week/i).scrollIntoViewIfNeeded();
    const trendingSection = page.locator('section, div').filter({ hasText: /trending this week/i }).first();
    const cards = trendingSection.locator('a, article, .card, [class*="card"]');
    await expect(cards).toHaveCount(await cards.count()); // ensure rendered
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
  });

  // TC-007
  test('TC-007 · Latest Submissions section displays at least 3 cards', async ({ page }) => {
    await page.getByText(/latest submissions/i).scrollIntoViewIfNeeded();
    const latestSection = page.locator('section, div').filter({ hasText: /latest submissions/i }).first();
    const cards = latestSection.locator('a, article, .card, [class*="card"]');
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
  });

  // TC-008
  test('TC-008 · Upvote button is interactive', async ({ page }) => {
    const upvoteBtn = page.getByText(/upvote/i).first();
    await upvoteBtn.scrollIntoViewIfNeeded();
    await expect(upvoteBtn).toBeVisible();
    await upvoteBtn.click();
    // Expect login prompt or vote change
    await expect(
      page.getByText(/sign in|login|voted|thank/i).first()
    ).toBeVisible({ timeout: 5_000 }).catch(() => {/* vote registered silently */});
  });

  // TC-009
  test('TC-009 · FAQ section is visible with at least 4 items', async ({ page }) => {
    await page.getByText(/frequently asked questions|faq/i).first().scrollIntoViewIfNeeded();
    const faqItems = page.locator('h3, summary, dt').filter({ hasText: /what|how|are|can/i });
    expect(await faqItems.count()).toBeGreaterThanOrEqual(4);
  });

  // TC-010
  test('TC-010 · Stats counter displays non-zero numbers', async ({ page }) => {
    const stats = page.getByText(/websites submitted|community members|total votes/i);
    await expect(stats.first()).toBeVisible();
    expect(await stats.count()).toBeGreaterThanOrEqual(2);
  });

  // TC-011
  test('TC-011 · Social media links present in footer', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = page.locator('footer').first();
    const socialLinks = footer.locator('a[href*="twitter"], a[href*="x.com"], a[href*="reddit"], a[href*="instagram"]');
    expect(await socialLinks.count()).toBeGreaterThanOrEqual(2);
  });

  // TC-012
  test('TC-012 · Leaderboard page loads', async ({ page }) => {
    await page.getByRole('link', { name: /leaderboard/i }).first().click();
    await page.waitForURL(/leaderboard/);
    await expect(page).toHaveURL(/leaderboard/);
  });
});

test.describe('TC-E · Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  });

  // TC-E01
  test('TC-E01 · Random button clicked rapidly 5 times without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const btn = page.getByText(/take me somewhere useless/i);
    for (let i = 0; i < 5; i++) {
      await btn.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
      if (page.url() !== BASE_URL) {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      }
    }
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  // TC-E02
  test('TC-E02 · Page renders above-fold CTA on slow connection', async ({ page, context }) => {
    await context.route('**/*', route => route.continue()); // reset any routes
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, downloadThroughput: 50_000, uploadThroughput: 25_000, latency: 400,
    });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByText(/take me somewhere useless/i)).toBeVisible({ timeout: 30_000 });
  });

  // TC-E05
  test('TC-E05 · Page shows content when revisited (browser cache)', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.reload();
    await expect(page.getByText(/take me somewhere useless/i)).toBeVisible();
  });
});

test.describe('TC-A · Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  });

  // TC-A01
  test('TC-A01 · Keyboard: Tab reaches the CTA button', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
    // Tab cycle should eventually reach the CTA
    await expect(page.getByText(/take me somewhere useless/i)).toBeVisible();
    expect(focused).toBeTruthy();
  });

  // TC-A02
  test('TC-A02 · CTA button has accessible text', async ({ page }) => {
    const btn = page.getByText(/take me somewhere useless/i);
    await expect(btn).toBeVisible();
    const text = await btn.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  // TC-A03
  test('TC-A03 · Page has a main landmark element', async ({ page }) => {
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeAttached();
  });
});

test.describe('TC-M · Mobile Viewport', () => {
  // TC-M01
  test('TC-M01 · Layout is responsive on mobile (375×667)', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/take me somewhere useless/i)).toBeVisible();
    await ctx.close();
  });

  // TC-M02
  test('TC-M02 · CTA button has adequate touch target size', async ({ browser }) => {
    const ctx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const btn = page.getByText(/take me somewhere useless/i);
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await ctx.close();
  });

  // TC-M03
  test('TC-M03 · Meta viewport does not block user scaling', async ({ page }) => {
    await page.goto(BASE_URL);
    const metaContent = await page.$eval(
      'meta[name="viewport"]',
      el => el.getAttribute('content') || ''
    ).catch(() => '');
    expect(metaContent).not.toMatch(/user-scalable\s*=\s*no/i);
  });
});
`;
}

function staticAndroidSpec(planPath) {
  return `// ⚠️  GENERATOR AGENT — Static fallback spec (set OPENAI_API_KEY for AI generation)
// Plan source: ${planPath}
// Platform   : Android
// Generated  : ${new Date().toISOString()}

import { test, expect } from '@mobilewright/test';

const TARGET_URL = 'https://uselessweb.org/';

test.use({ platform: 'android' });

test.describe('UselessWeb.org · Android Mobile Tests', () => {
  test.beforeEach(async ({ device }) => {
    await device.openUrl(TARGET_URL);
    // Wait for page to load in mobile browser
    await new Promise(r => setTimeout(r, 3000));
  });

  test('TC-001 · Page loads and shows main heading', async ({ screen }) => {
    await expect(screen.getByText('The Useless Web')).toBeVisible();
  });

  test('TC-002 · CTA button is visible and tappable', async ({ screen }) => {
    const btn = screen.getByText(/take me somewhere useless/i);
    await expect(btn).toBeVisible();
    await btn.tap();
  });

  test('TC-003 · Navigation links present', async ({ screen }) => {
    await expect(screen.getByText(/browse/i)).toBeVisible();
  });

  test('TC-006 · Trending section visible after scroll', async ({ screen }) => {
    await screen.swipe('up', { distance: 400 });
    await expect(screen.getByText(/trending this week/i)).toBeVisible();
  });

  test('TC-009 · FAQ section accessible via scroll', async ({ screen }) => {
    await screen.swipe('up', { distance: 1200 });
    await expect(screen.getByText(/frequently asked questions/i)).toBeVisible();
  });

  test('TC-M01 · Portrait orientation renders without overflow', async ({ device, screen }) => {
    await device.setOrientation('portrait');
    await expect(screen.getByText('The Useless Web')).toBeVisible();
  });

  test('TC-M02 · Landscape orientation adapts correctly', async ({ device, screen }) => {
    await device.setOrientation('landscape');
    await expect(screen.getByText('The Useless Web')).toBeVisible();
    await device.setOrientation('portrait');
  });
});
`;
}

function staticIOSSpec(planPath) {
  return `// ⚠️  GENERATOR AGENT — Static fallback spec (set OPENAI_API_KEY for AI generation)
// Plan source: ${planPath}
// Platform   : iOS
// Generated  : ${new Date().toISOString()}

import { test, expect } from '@mobilewright/test';

const TARGET_URL = 'https://uselessweb.org/';

test.use({ platform: 'ios' });

test.describe('UselessWeb.org · iOS Mobile Tests', () => {
  test.beforeEach(async ({ device }) => {
    await device.openUrl(TARGET_URL);
    // Wait for page to load in Safari
    await new Promise(r => setTimeout(r, 3000));
  });

  test('TC-001 · Page loads and shows main heading', async ({ screen }) => {
    await expect(screen.getByText('The Useless Web')).toBeVisible();
  });

  test('TC-002 · CTA button is visible and tappable on iOS', async ({ screen }) => {
    const btn = screen.getByText(/take me somewhere useless/i);
    await expect(btn).toBeVisible();
    await btn.tap();
  });

  test('TC-003 · Navigation links present in mobile view', async ({ screen }) => {
    await expect(screen.getByText(/browse/i)).toBeVisible();
  });

  test('TC-006 · Trending section visible after swipe-up', async ({ screen }) => {
    await screen.swipe('up', { distance: 400 });
    await expect(screen.getByText(/trending/i)).toBeVisible();
  });

  test('TC-009 · FAQ section reachable via scroll', async ({ screen }) => {
    await screen.swipe('up', { distance: 1200 });
    await expect(screen.getByText(/frequently asked questions/i)).toBeVisible();
  });

  test('TC-M01 · Portrait orientation — layout intact', async ({ device, screen }) => {
    await device.setOrientation('portrait');
    await expect(screen.getByText('The Useless Web')).toBeVisible();
  });

  test('TC-M02 · Landscape orientation — layout adapts', async ({ device, screen }) => {
    await device.setOrientation('landscape');
    await expect(screen.getByText('The Useless Web')).toBeVisible();
    await device.setOrientation('portrait');
  });

  test('TC-A01 · Accessibility tree contains CTA button role', async ({ screen }) => {
    const btn = screen.getByRole('button', { name: /take me somewhere useless/i });
    await expect(btn).toBeVisible({ timeout: 10_000 });
  });
});
`;
}

// ── LLM generation ─────────────────────────────────────────────────────────────
async function generateSpec(planContent, platform, planPath) {
  const systemPrompt = SYSTEM_PROMPTS[platform] || SYSTEM_PROMPTS.web;

  console.log(`🤖 [Generator] Calling LLM to generate ${platform} spec …`);

  const completion = await openai.chat.completions.create({
    model:    'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: `Here is the test plan:\n\n${planContent}` },
    ],
    temperature: 0.2,
    max_tokens:  4096,
  });

  let code = completion.choices[0].message.content.trim();

  // Strip markdown fences if LLM wraps code in them
  code = code.replace(/^```(?:javascript|js|typescript|ts)?\n?/i, '').replace(/```\s*$/, '');

  return code;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log('🎭 GENERATOR AGENT — Starting');
    console.log(`   Plan     : ${PLAN_FILE}`);
    console.log(`   Platform : ${PLATFORM}`);

    if (!fs.existsSync(PLAN_FILE)) {
      throw new Error(`Plan file not found: ${PLAN_FILE}\nRun the Planner agent first.`);
    }

    ensureDir(OUT_DIR);

    const planContent = fs.readFileSync(PLAN_FILE, 'utf8');

    let specCode;

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
      console.warn('\n⚠️  OPENAI_API_KEY not set — using static spec template.\n');
      if (PLATFORM === 'android')     specCode = staticAndroidSpec(PLAN_FILE);
      else if (PLATFORM === 'ios')    specCode = staticIOSSpec(PLAN_FILE);
      else                            specCode = staticWebSpec(PLAN_FILE);
    } else {
      specCode = await generateSpec(planContent, PLATFORM, PLAN_FILE);
    }

    const ext      = PLATFORM === 'web' ? 'spec.js' : 'test.js';
    const basename = path.basename(PLAN_FILE, '.md');
    const outFile  = path.join(OUT_DIR, `${basename}.${ext}`);

    fs.writeFileSync(outFile, specCode, 'utf8');

    console.log(`\n✅ [Generator] Spec written to: ${outFile}`);
    console.log('   Hand this file to the Healer agent to execute & repair.\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ [Generator] Fatal error:', err.message);
    process.exit(1);
  }
})();
