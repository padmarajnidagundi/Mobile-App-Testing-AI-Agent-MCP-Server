/**
 * UselessWeb.org — Android Mobile Test Suite (Mobilewright)
 * ─────────────────────────────────────────────────────────────────────────────
 * Target  : https://uselessweb.org/
 * Runner  : Mobilewright (@mobilewright/test)
 * Platform: Android device / emulator
 *
 * Prerequisites:
 *   - ADB installed and in PATH
 *   - Android emulator running OR real device connected via ADB
 *   - mobilecli running (auto-started by Mobilewright)
 *
 * Run:
 *   npx mobilewright test tests/uselessweb/uselessweb-android.test.js
 */

// @ts-check
const { test, expect } = require('@mobilewright/test');

const TARGET_URL = 'https://uselessweb.org/';

test.use({ platform: 'android' });

// ═══════════════════════════════════════════════════════════════════════════════
// Setup helper — open URL in Android browser
// ═══════════════════════════════════════════════════════════════════════════════
async function openUselessWeb(device) {
  await device.openUrl(TARGET_URL);
  // Allow mobile browser to fully render
  await new Promise(r => setTimeout(r, 3500));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Core Functional Tests — Android
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Core Functional — Android TC-001 to TC-014', () => {
  test.beforeEach(async ({ device }) => {
    await openUselessWeb(device);
  });

  // ── TC-001 ──────────────────────────────────────────────────────────────────
  test('TC-001 · Page loads and shows main heading on Android', async ({ screen }) => {
    await expect(screen.getByText('The Useless Web')).toBeVisible({ timeout: 15_000 });
  });

  // ── TC-002 ──────────────────────────────────────────────────────────────────
  test('TC-002 · CTA button visible and tappable on Android', async ({ screen }) => {
    const btn = screen.getByText(/take me somewhere useless/i);
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.tap();
    // After tap, we may land on another site — just verify no crash
    await new Promise(r => setTimeout(r, 2000));
  });

  // ── TC-003 ──────────────────────────────────────────────────────────────────
  test('TC-003 · Navigation elements visible on Android mobile view', async ({ screen }) => {
    await expect(screen.getByText(/browse/i)).toBeVisible({ timeout: 10_000 });
  });

  // ── TC-006 ──────────────────────────────────────────────────────────────────
  test('TC-006 · Trending section visible after scroll on Android', async ({ screen }) => {
    await screen.swipe('up', { distance: 500, duration: 600 });
    await expect(screen.getByText(/trending/i)).toBeVisible({ timeout: 10_000 });
  });

  // ── TC-007 ──────────────────────────────────────────────────────────────────
  test('TC-007 · Latest Submissions visible after further scroll', async ({ screen }) => {
    await screen.swipe('up', { distance: 500, duration: 600 });
    await screen.swipe('up', { distance: 500, duration: 600 });
    await expect(screen.getByText(/latest submissions/i)).toBeVisible({ timeout: 10_000 });
  });

  // ── TC-009 ──────────────────────────────────────────────────────────────────
  test('TC-009 · FAQ section reachable by scrolling on Android', async ({ screen }) => {
    for (let i = 0; i < 5; i++) {
      await screen.swipe('up', { distance: 500, duration: 400 });
    }
    await expect(screen.getByText(/frequently asked questions/i)).toBeVisible({ timeout: 10_000 });
  });

  // ── TC-010 ──────────────────────────────────────────────────────────────────
  test('TC-010 · Stats counters visible on Android', async ({ screen }) => {
    await screen.swipe('up', { distance: 300 });
    await expect(screen.getByText(/websites submitted/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Mobile-Specific Tests — Android
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Mobile-Specific — Android TC-M01 to TC-M05', () => {
  test.beforeEach(async ({ device }) => {
    await openUselessWeb(device);
  });

  // ── TC-M01 ──────────────────────────────────────────────────────────────────
  test('TC-M01 · Portrait orientation — heading and CTA visible', async ({ device, screen }) => {
    await device.setOrientation('portrait');
    await expect(screen.getByText('The Useless Web')).toBeVisible({ timeout: 10_000 });
    await expect(screen.getByText(/take me somewhere useless/i)).toBeVisible({ timeout: 10_000 });
  });

  // ── TC-M02 ──────────────────────────────────────────────────────────────────
  test('TC-M02 · Landscape orientation — layout adapts without crash', async ({ device, screen }) => {
    await device.setOrientation('landscape');
    await new Promise(r => setTimeout(r, 1500));
    await expect(screen.getByText('The Useless Web')).toBeVisible({ timeout: 10_000 });
    await device.setOrientation('portrait');
  });

  // ── TC-M04 ──────────────────────────────────────────────────────────────────
  test('TC-M04 · Swipe-up scroll reveals more content', async ({ screen }) => {
    await screen.swipe('up', { distance: 600, duration: 700 });
    // After scroll the initial content should no longer be at top but page is live
    const isVisible = await screen.getByText(/trending|latest|useless/i).isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });

  // ── TC-M05 ──────────────────────────────────────────────────────────────────
  test('TC-M05 · Back navigation works on Android', async ({ device, screen }) => {
    await screen.getByText(/browse/i).tap().catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    await screen.pressButton('BACK');
    await new Promise(r => setTimeout(r, 1500));
    await expect(screen.getByText(/take me somewhere useless/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Edge Cases — Android
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Edge Cases — Android TC-E01', () => {
  test('TC-E01 · Rapid CTA taps (3×) — app remains stable', async ({ device, screen }) => {
    await openUselessWeb(device);
    const btn = screen.getByText(/take me somewhere useless/i);
    await expect(btn).toBeVisible({ timeout: 10_000 });

    for (let i = 0; i < 3; i++) {
      await btn.tap().catch(() => {});
      await new Promise(r => setTimeout(r, 800));
      // Navigate back between taps
      await screen.pressButton('BACK').catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
    }

    // Verify app hasn't crashed — try to re-open the URL
    await openUselessWeb(device);
    await expect(screen.getByText(/useless web/i)).toBeVisible({ timeout: 15_000 });
  });
});
