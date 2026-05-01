/**
 * 🎭 PLANNER AGENT
 * ─────────────────────────────────────────────────────────────────────────────
 * Explores a target URL (web or mobile app), analyses its structure via the
 * Playwright accessibility tree, and uses an LLM to produce a structured
 * Markdown test-plan file that the Generator agent will later consume.
 *
 * Usage:
 *   node agents/planner.js --url https://uselessweb.org/ [--out plans/]
 *   node agents/planner.js --url https://uselessweb.org/ --platform android
 *   node agents/planner.js --url https://uselessweb.org/ --platform ios
 */

'use strict';

const { chromium }  = require('playwright');
const OpenAI         = require('openai');
const fs             = require('fs');
const path           = require('path');
const dotenv         = require('dotenv');

dotenv.config();

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => a.replace('--', '').split('='))
    .map(([k, ...v]) => [k, v.join('=') || true])
);

const TARGET_URL = args.url  || 'https://uselessweb.org/';
const PLATFORM   = args.platform || 'web';  // web | android | ios
const OUT_DIR    = args.out  || path.join(__dirname, '..', 'plans');

// ── OpenAI client ─────────────────────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY_HERE',
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function slug(url) {
  return url.replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Snapshot the page: collect title, URL, visible text, interactive roles,
 * nav links, and the serialised accessibility tree (truncated).
 */
async function snapshotPage(url) {
  console.log(`\n🔍 [Planner] Launching browser and navigating to: ${url}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: PLATFORM === 'android'
      ? { width: 412, height: 915 }   // Pixel 7 Pro
      : PLATFORM === 'ios'
        ? { width: 390, height: 844 } // iPhone 14 Pro
        : { width: 1280, height: 720 },
    userAgent: PLATFORM === 'android'
      ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
      : PLATFORM === 'ios'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17 Mobile/15E148 Safari/604.1'
        : undefined,
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000); // let JS paint

    const title   = await page.title();
    const pageUrl = page.url();

    // All visible text (first 4000 chars to stay within token budget)
    const bodyText = (await page.innerText('body')).slice(0, 4000);

    // Interactive elements summary
    const buttons  = await page.$$eval('button, [role="button"], a[href]',
      els => els.slice(0, 40).map(e => ({
        tag:  e.tagName,
        text: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 80),
        href: e.getAttribute('href') || null,
        role: e.getAttribute('role') || null,
      })));

    // Headings
    const headings = await page.$$eval('h1,h2,h3', els => els.map(e => ({
      level: e.tagName,
      text:  e.innerText.trim().slice(0, 120),
    })));

    // Forms / inputs
    const inputs   = await page.$$eval('input, textarea, select',
      els => els.slice(0, 20).map(e => ({
        type:        e.type || e.tagName,
        placeholder: e.placeholder || '',
        name:        e.name || e.id || '',
      })));

    // Accessibility snapshot (partial)
    let a11ySnap = '';
    try {
      const snap = await page.accessibility.snapshot();
      a11ySnap   = JSON.stringify(snap, null, 2).slice(0, 3000);
    } catch (_) { /* ignore */ }

    await browser.close();

    return { title, pageUrl, bodyText, buttons, headings, inputs, a11ySnap };
  } catch (err) {
    await browser.close();
    throw err;
  }
}

// ── LLM prompt ────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are a senior QA engineer and mobile testing expert.
Given a web-page snapshot, produce a comprehensive, structured Markdown test plan.

The plan MUST include:
1. **Overview** – purpose of the page, target platform(s).
2. **Test Scenarios** – grouped by feature area. Each scenario has:
   - ID (e.g. TC-001)
   - Title
   - Priority (High / Medium / Low)
   - Pre-conditions
   - Steps (numbered)
   - Expected Result
3. **Edge Cases** – at least 5 edge / negative scenarios.
4. **Accessibility Checks** – at least 3 checks.
5. **Performance Checks** – at least 2 checks.
6. **Mobile-specific Checks** – at least 3 checks (touch, viewport, orientation).

Format every scenario exactly like this block:

### TC-001 · <Title>
| Field | Value |
|---|---|
| Priority | High |
| Pre-conditions | Page loaded |
| Steps | 1. … 2. … |
| Expected Result | … |

Keep test IDs sequential. Use plain Markdown only.
`.trim();

async function generatePlan(snapshot, url, platform) {
  const userMsg = `
Target URL : ${url}
Platform   : ${platform}
Page Title : ${snapshot.title}

=== VISIBLE TEXT (truncated) ===
${snapshot.bodyText}

=== HEADINGS ===
${snapshot.headings.map(h => `${h.level}: ${h.text}`).join('\n')}

=== INTERACTIVE ELEMENTS ===
${JSON.stringify(snapshot.buttons, null, 2)}

=== FORM INPUTS ===
${JSON.stringify(snapshot.inputs, null, 2)}

=== ACCESSIBILITY TREE (partial) ===
${snapshot.a11ySnap}

Generate the full test plan now.
`.trim();

  console.log('🤖 [Planner] Calling LLM to generate test plan …');

  const completion = await openai.chat.completions.create({
    model:    'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userMsg },
    ],
    temperature: 0.3,
    max_tokens:  4096,
  });

  return completion.choices[0].message.content;
}

// ── Fallback plan (when no API key is set) ────────────────────────────────────
function fallbackPlan(url, platform) {
  return `# Test Plan — ${url}
> **Platform:** ${platform}  
> **Generated by:** Planner Agent (static fallback — set OPENAI_API_KEY for AI generation)  
> **Date:** ${new Date().toISOString().split('T')[0]}

---

## Overview
The Useless Web (${url}) is a random-website generator with a community submission
board, trending section, category filters, and FAQ. Tests cover navigation,
the random-redirect button, community content, accessibility, and mobile UX.

---

## Test Scenarios

### TC-001 · Page Loads Successfully
| Field | Value |
|---|---|
| Priority | High |
| Pre-conditions | Network available |
| Steps | 1. Navigate to ${url} |
| Expected Result | Page title contains "Useless Web"; HTTP 200 |

### TC-002 · Random-Website Button Redirects
| Field | Value |
|---|---|
| Priority | High |
| Pre-conditions | Page fully loaded |
| Steps | 1. Click "🎲 Take me somewhere useless" 2. Wait for navigation |
| Expected Result | Browser navigates to a different domain |

### TC-003 · Navigation Links Are Present
| Field | Value |
|---|---|
| Priority | High |
| Pre-conditions | Page loaded |
| Steps | 1. Locate header nav 2. Verify Browse, Submit, Leaderboard links |
| Expected Result | All three links visible and clickable |

### TC-004 · Browse Page Loads
| Field | Value |
|---|---|
| Priority | Medium |
| Pre-conditions | Page loaded |
| Steps | 1. Click "Browse" link 2. Wait for page |
| Expected Result | URL becomes /websites/ and website cards appear |

### TC-005 · Sign-Up Link Is Present
| Field | Value |
|---|---|
| Priority | Medium |
| Pre-conditions | Page loaded |
| Steps | 1. Locate "Sign Up" in header 2. Click it |
| Expected Result | Navigates to /signup/ |

### TC-006 · Trending Section Displays Cards
| Field | Value |
|---|---|
| Priority | High |
| Pre-conditions | Page loaded |
| Steps | 1. Scroll to "Trending This Week" 2. Count visible cards |
| Expected Result | At least 3 trending website cards visible |

### TC-007 · Latest Submissions Section Displays Cards
| Field | Value |
|---|---|
| Priority | Medium |
| Pre-conditions | Page loaded |
| Steps | 1. Scroll to "Latest Submissions" 2. Count cards |
| Expected Result | At least 3 submission cards visible |

### TC-008 · Upvote Button Is Interactive
| Field | Value |
|---|---|
| Priority | Medium |
| Pre-conditions | Page loaded, user not logged in |
| Steps | 1. Locate first upvote button 2. Click it |
| Expected Result | Button responds (login prompt or vote registered) |

### TC-009 · FAQ Section Is Visible
| Field | Value |
|---|---|
| Priority | Low |
| Pre-conditions | Page loaded |
| Steps | 1. Scroll to FAQ 2. Verify questions are shown |
| Expected Result | At least 4 FAQ items visible |

### TC-010 · Stats Counter Displays
| Field | Value |
|---|---|
| Priority | Medium |
| Pre-conditions | Page loaded |
| Steps | 1. Locate stats bar (Websites, Members, Votes) 2. Read values |
| Expected Result | All three stat counters show non-zero numbers |

### TC-011 · Social Media Links in Footer
| Field | Value |
|---|---|
| Priority | Low |
| Pre-conditions | Page loaded |
| Steps | 1. Scroll to footer 2. Verify social links (Twitter/X, Reddit, Instagram) |
| Expected Result | At least 3 social icons are present with valid href |

### TC-012 · Leaderboard Page Loads
| Field | Value |
|---|---|
| Priority | Medium |
| Pre-conditions | Page loaded |
| Steps | 1. Click "Leaderboard" 2. Wait for /leaderboard/ |
| Expected Result | Leaderboard page renders with contributor list |

---

## Edge Cases

### TC-E01 · Random Button Clicked Rapidly (5×)
| Field | Value |
|---|---|
| Priority | Medium |
| Pre-conditions | Page loaded |
| Steps | 1. Click the random button 5 times in 2 seconds |
| Expected Result | No JS errors; navigates or shows rate-limit message |

### TC-E02 · Page Load on Slow 3G
| Field | Value |
|---|---|
| Priority | Medium |
| Pre-conditions | Throttle network to Slow 3G |
| Steps | 1. Navigate to URL 2. Measure LCP |
| Expected Result | LCP < 4 s; CTA button still visible above fold |

### TC-E03 · Search / Filter With Empty String
| Field | Value |
|---|---|
| Priority | Low |
| Pre-conditions | Browse page open |
| Steps | 1. Clear search field 2. Submit |
| Expected Result | All websites displayed; no 500 error |

### TC-E04 · Invalid Submit URL
| Field | Value |
|---|---|
| Priority | Medium |
| Pre-conditions | On /signup/ page |
| Steps | 1. Enter "not-a-url" as website URL 2. Submit |
| Expected Result | Validation error shown; form not submitted |

### TC-E05 · Offline Mode
| Field | Value |
|---|---|
| Priority | Medium |
| Pre-conditions | Page loaded once (cached) |
| Steps | 1. Go offline 2. Reload page |
| Expected Result | Graceful offline message or cached content shown |

---

## Accessibility Checks

### TC-A01 · Keyboard Navigation
Verify all interactive elements reachable via Tab key in logical order.

### TC-A02 · ARIA Labels on Buttons
Confirm CTA buttons have descriptive aria-label or visible text.

### TC-A03 · Colour Contrast
Run automated contrast check; all text must meet WCAG 2.1 AA (4.5:1).

---

## Performance Checks

### TC-P01 · First Contentful Paint < 2.5 s
### TC-P02 · Total Blocking Time < 300 ms on desktop

---

## Mobile-Specific Checks

### TC-M01 · Portrait & Landscape Orientation
Rotate device; layout should adapt without overflow.

### TC-M02 · Touch Target Size
CTA button tap target ≥ 44 × 44 px.

### TC-M03 · Pinch-to-Zoom Not Blocked
Verify \`user-scalable=no\` is NOT set in meta viewport.
`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log('🎭 PLANNER AGENT — Starting');
    console.log(`   URL      : ${TARGET_URL}`);
    console.log(`   Platform : ${PLATFORM}`);

    ensureDir(OUT_DIR);

    let plan;

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
      console.warn('\n⚠️  OPENAI_API_KEY not set — using built-in static test plan.\n');
      plan = fallbackPlan(TARGET_URL, PLATFORM);
    } else {
      const snapshot = await snapshotPage(TARGET_URL);
      plan           = await generatePlan(snapshot, TARGET_URL, PLATFORM);
    }

    const filename = `${slug(TARGET_URL)}-${PLATFORM}-test-plan.md`;
    const outPath  = path.join(OUT_DIR, filename);
    fs.writeFileSync(outPath, plan, 'utf8');

    console.log(`\n✅ [Planner] Test plan written to: ${outPath}`);
    console.log('   Hand this file to the Generator agent next.\n');

    // Print a preview
    console.log('─'.repeat(72));
    console.log(plan.split('\n').slice(0, 20).join('\n'));
    console.log('  … (truncated) …');
    console.log('─'.repeat(72));

    process.exit(0);
  } catch (err) {
    console.error('❌ [Planner] Fatal error:', err.message);
    process.exit(1);
  }
})();
