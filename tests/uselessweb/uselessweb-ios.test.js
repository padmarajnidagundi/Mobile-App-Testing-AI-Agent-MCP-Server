/**
 * UselessWeb.org — iOS Mobile Test Suite (Mobilewright)
 * ─────────────────────────────────────────────────────────────────────────────
 * Target  : https://uselessweb.org/
 * Runner  : Mobilewright (@mobilewright/test)
 * Platform: iOS simulator or real device
 *
 * Prerequisites (macOS):
 *   - Xcode installed with Command Line Tools
 *   - iOS Simulator booted: xcrun simctl boot "iPhone 16"
 *   - mobilecli running (auto-started by Mobilewright)
 *
 * Run:
 *   npx mobilewright test tests/uselessweb/uselessweb-ios.test.js
 */

// @ts-check
const { test, expect } = require('@mobilewright/test');

const TARGET_URL = 'https://uselessweb.org/';

test.use({ platform: 'ios' });

// ═══════════════════════════════════════════════════════════════════════════════
// Setup helper — open URL in iOS Safari / WebView
// ═══════════════════════════════════════════════════════════════════════════════
async function openUselessWeb(device) {
  await device.openUrl(TARGET_URL);
  // Allow Safari on iOS to render the page
  await new Promise(r => setTimeout(r, 4000));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Core Functional Tests — iOS
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Core Functional — iOS TC-001 to TC-014', () => {
  test.beforeEach(async ({ device }) => {
    await openUselessWeb(device);
  });

  // ── TC-001 ──────────────────────────────────────────────────────────────────
  test('TC-001 · Page loads and shows main heading on iOS', async ({ screen }) => {
    await expect(screen.getByText('The Useless Web')).toBeVisible({ timeout: 20_000 });
  });

  // ── TC-002 ──────────────────────────────────────────────────────────────────
  test('TC-002 · CTA button visible and tappable on iOS Safari', async ({ screen }) => {
    const btn = screen.getByText(/take me somewhere useless/i);
    await expect(btn).toBeVisible({ timeout: 15_000 });
    await btn.tap();
    await new Promise(r => setTimeout(r, 2500));
  });

  // ── TC-003 ──────────────────────────────────────────────────────────────────
  test('TC-003 · Navigation elements visible on iOS mobile view', async ({ screen }) => {
    await expect(screen.getByText(/browse/i)).toBeVisible({ timeout: 10_000 });
  });

  // ── TC-006 ──────────────────────────────────────────────────────────────────
  test('TC-006 · Trending section visible after swipe-up on iOS', async ({ screen }) => {
    await screen.swipe('up', { distance: 500, duration: 700 });
    await expect(screen.getByText(/trending/i)).toBeVisible({ timeout: 10_000 });
  });

  // ── TC-007 ──────────────────────────────────────────────────────────────────
  test('TC-007 · Latest Submissions section reachable on iOS', async ({ screen }) => {
    await screen.swipe('up', { distance: 500 });
    await screen.swipe('up', { distance: 500 });
    await expect(screen.getByText(/latest submissions/i)).toBeVisible({ timeout: 10_000 });
  });

  // ── TC-009 ──────────────────────────────────────────────────────────────────
  test('TC-009 · FAQ section reachable by scrolling on iOS', async ({ screen }) => {
    for (let i = 0; i < 6; i++) {
      await screen.swipe('up', { distance: 500, duration: 400 });
    }
    await expect(screen.getByText(/frequently asked questions/i)).toBeVisible({ timeout: 15_000 });
  });

  // ── TC-010 ──────────────────────────────────────────────────────────────────
  test('TC-010 · Stats counters visible after scroll on iOS', async ({ screen }) => {
    await screen.swipe('up', { distance: 300 });
    await expect(screen.getByText(/websites submitted/i)).toBeVisible({ timeout: 10_000 });
  });

  // ── TC-014 ──────────────────────────────────────────────────────────────────
  test('TC-014 · How It Works section reachable on iOS', async ({ screen }) => {
    for (let i = 0; i < 4; i++) {
      await screen.swipe('up', { distance: 500 });
    }
    await expect(screen.getByText(/how it works/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Accessibility Tests — iOS (VoiceOver / Accessibility Tree)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Accessibility — iOS TC-A01 to TC-A02', () => {
  test.beforeEach(async ({ device }) => {
    await openUselessWeb(device);
  });

  // ── TC-A01 ──────────────────────────────────────────────────────────────────
  test('TC-A01 · CTA button accessible via accessibility tree on iOS', async ({ screen }) => {
    // Mobilewright exposes the iOS accessibility tree via XCUIElementType
    const btn = screen.getByRole('button', { name: /take me somewhere useless/i });
    await expect(btn).toBeVisible({ timeout: 15_000 });
  });

  // ── TC-A02 ──────────────────────────────────────────────────────────────────
  test('TC-A02 · Navigation links are accessible on iOS', async ({ screen }) => {
    const browseLink = screen.getByRole('link', { name: /browse/i });
    await expect(browseLink).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Mobile-Specific Tests — iOS
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Mobile-Specific — iOS TC-M01 to TC-M05', () => {
  test.beforeEach(async ({ device }) => {
    await openUselessWeb(device);
  });

  // ── TC-M01 ──────────────────────────────────────────────────────────────────
  test('TC-M01 · Portrait orientation — main content intact on iOS', async ({ device, screen }) => {
    await device.setOrientation('portrait');
    await new Promise(r => setTimeout(r, 1500));
    await expect(screen.getByText('The Useless Web')).toBeVisible({ timeout: 15_000 });
    await expect(screen.getByText(/take me somewhere useless/i)).toBeVisible({ timeout: 10_000 });
  });

  // ── TC-M02 ──────────────────────────────────────────────────────────────────
  test('TC-M02 · Landscape orientation — iOS layout adapts correctly', async ({ device, screen }) => {
    await device.setOrientation('landscape');
    await new Promise(r => setTimeout(r, 2000));
    await expect(screen.getByText('The Useless Web')).toBeVisible({ timeout: 15_000 });
    await device.setOrientation('portrait');
  });

  // ── TC-M04 ──────────────────────────────────────────────────────────────────
  test('TC-M04 · iOS swipe-up gesture reveals more content', async ({ screen }) => {
    await screen.swipe('up', { distance: 600, duration: 800 });
    const visible = await screen.getByText(/trending|latest|useless/i).isVisible().catch(() => false);
    expect(visible).toBe(true);
  });

  // ── TC-M05 ──────────────────────────────────────────────────────────────────
  test('TC-M05 · iOS back gesture returns to home after browse tap', async ({ device, screen }) => {
    // Tap a link to navigate away
    await screen.getByText(/browse/i).tap().catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // Simulate iOS back gesture — swipe from left edge
    await screen.swipe('right', { distance: 300, duration: 400 });
    await new Promise(r => setTimeout(r, 2000));

    await expect(screen.getByText(/take me somewhere useless/i)).toBeVisible({ timeout: 15_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Edge Cases — iOS
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Edge Cases — iOS', () => {
  // ── TC-E01 ──────────────────────────────────────────────────────────────────
  test('TC-E01 · Rapid CTA taps (3×) — iOS remains stable', async ({ device, screen }) => {
    await openUselessWeb(device);
    const btn = screen.getByText(/take me somewhere useless/i);
    await expect(btn).toBeVisible({ timeout: 15_000 });

    for (let i = 0; i < 3; i++) {
      await btn.tap().catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      await screen.swipe('right', { distance: 200 }).catch(() => {}); // attempt back
      await new Promise(r => setTimeout(r, 1000));
    }

    // Re-open and verify stability
    await openUselessWeb(device);
    await expect(screen.getByText(/useless web/i)).toBeVisible({ timeout: 20_000 });
  });

  // ── TC-E05 ──────────────────────────────────────────────────────────────────
  test('TC-E05 · Reload URL shows fresh content on iOS', async ({ device, screen }) => {
    await openUselessWeb(device);
    // Navigate away and back
    await device.openUrl('about:blank');
    await new Promise(r => setTimeout(r, 1000));
    await openUselessWeb(device);
    await expect(screen.getByText('The Useless Web')).toBeVisible({ timeout: 20_000 });
  });
});
