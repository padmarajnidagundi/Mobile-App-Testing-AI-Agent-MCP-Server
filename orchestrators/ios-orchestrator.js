/**
 * 🤖 iOS ORCHESTRATION AGENT
 * ─────────────────────────────────────────────────────────────────────────────
 * Drives the full AI-testing pipeline for iOS simulators and real devices:
 *
 *   1. 🎭 Planner   → analyses target URL and writes a Markdown test plan
 *   2. 🎭 Generator → converts the plan into a Mobilewright spec file
 *   3. 🎭 Healer    → executes tests and auto-repairs failures (up to N cycles)
 *
 * Usage:
 *   node orchestrators/ios-orchestrator.js
 *   node orchestrators/ios-orchestrator.js --url https://uselessweb.org/ --retries 3
 *   node orchestrators/ios-orchestrator.js --device "iPhone 16 Pro"
 *
 * Environment:
 *   OPENAI_API_KEY   — required for AI-powered plan + heal steps
 *   XCODE_PATH       — optional, custom Xcode path (macOS only)
 *
 * Note: iOS simulators run on macOS only.
 *       On Windows/Linux, this orchestrator targets cloud devices via mobile-use.com.
 */

'use strict';

const { spawnSync } = require('child_process');
const path          = require('path');
const fs            = require('fs');
const dotenv        = require('dotenv');

dotenv.config();

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => a.replace('--', '').split('='))
    .map(([k, ...v]) => [k, v.join('=') || true])
);

const TARGET_URL   = args.url    || 'https://uselessweb.org/';
const MAX_RETRIES  = args.retries || '3';
const DEVICE_NAME  = args.device  || 'iPhone 16';
const ROOT         = path.join(__dirname, '..');
const IS_MACOS     = process.platform === 'darwin';

// ── Pretty logging ─────────────────────────────────────────────────────────────
const IOS_BANNER = `
╔══════════════════════════════════════════════════════════════╗
║          🍎  iOS ORCHESTRATION AGENT  🍎                      ║
║  Target : ${TARGET_URL.padEnd(50)}║
║  Device : ${DEVICE_NAME.padEnd(50)}║
║  Pipeline: Planner → Generator → Healer                      ║
╚══════════════════════════════════════════════════════════════╝
`.trim();

function log(step, msg) {
  const ts = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${ts}] [iOS/${step}] ${msg}`);
}

function banner(title) {
  const line = '─'.repeat(62);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

// ── Run a Node script and stream output ───────────────────────────────────────
function runAgent(scriptRelPath, extraArgs = []) {
  const scriptPath = path.join(ROOT, scriptRelPath);

  log('runner', `Executing: node ${scriptPath} ${extraArgs.join(' ')}`);

  const result = spawnSync('node', [scriptPath, ...extraArgs], {
    stdio:    'inherit',
    cwd:      ROOT,
    encoding: 'utf8',
    shell:    true,
    timeout:  300_000,  // 5 min max per agent step
  });

  if (result.error) throw new Error(`Spawn error: ${result.error.message}`);
  return result.status ?? 1;
}

// ── Check prerequisites ────────────────────────────────────────────────────────
function checkPrerequisites() {
  banner('🔍 Pre-flight Checks');

  const checks = [];

  // Node version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  checks.push({ name: 'Node.js >= 18', ok: major >= 18, hint: nodeVersion });

  // OPENAI_API_KEY
  const hasKey = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE');
  checks.push({
    name: 'OPENAI_API_KEY',
    ok:   hasKey,
    hint: hasKey ? 'set' : '⚠️  not set (AI features disabled)',
  });

  // mobilewright installed
  try {
    require.resolve('mobilewright', { paths: [ROOT] });
    checks.push({ name: 'mobilewright', ok: true, hint: 'installed' });
  } catch {
    checks.push({ name: 'mobilewright', ok: false, hint: 'run: npm install mobilewright' });
  }

  // mobilecli
  const mobilecli = spawnSync('mobilecli', ['--version'], { encoding: 'utf8', shell: true });
  checks.push({
    name: 'mobilecli',
    ok:   mobilecli.status === 0,
    hint: mobilecli.status === 0 ? mobilecli.stdout.trim() : '⚠️  not found',
  });

  // macOS + Xcode (required for local iOS sim)
  if (IS_MACOS) {
    const xcode = spawnSync('xcode-select', ['-p'], { encoding: 'utf8' });
    checks.push({
      name: 'Xcode',
      ok:   xcode.status === 0,
      hint: xcode.status === 0 ? xcode.stdout.trim() : '⚠️  not installed — run: xcode-select --install',
    });

    // xcrun simctl
    const simList = spawnSync('xcrun', ['simctl', 'list', 'devices', 'booted'], { encoding: 'utf8' });
    const bootedSims = (simList.stdout || '').split('\n').filter(l => l.includes('Booted'));
    checks.push({
      name: 'iOS Simulator',
      ok:   bootedSims.length > 0,
      hint: bootedSims.length > 0
        ? bootedSims[0].trim()
        : `⚠️  no booted simulator — run: xcrun simctl boot "${DEVICE_NAME}"`,
    });
  } else {
    checks.push({
      name: 'macOS (iOS sims)',
      ok:   false,
      hint: `⚠️  Non-macOS detected (${process.platform}). Use mobile-use.com cloud for real iOS devices.`,
    });

    // Check if cloud env var is set
    const hasCloud = !!process.env.MOBILE_USE_API_KEY;
    checks.push({
      name: 'mobile-use.com API key',
      ok:   hasCloud,
      hint: hasCloud ? 'set' : '⚠️  set MOBILE_USE_API_KEY to use cloud iOS devices',
    });
  }

  for (const c of checks) {
    const icon = c.ok ? '✅' : '⚠️ ';
    console.log(`  ${icon}  ${c.name.padEnd(30)} ${c.hint}`);
  }

  console.log('');

  // Only fatal if mobilewright itself is missing
  const mobilewrightCheck = checks.find(c => c.name === 'mobilewright');
  if (!mobilewrightCheck?.ok) {
    throw new Error('mobilewright not installed. Run: npm install mobilewright');
  }
}

// ── Derive plan & spec paths ───────────────────────────────────────────────────
function planFileFor(url) {
  const slug = url.replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  return path.join(ROOT, 'plans', `${slug}-ios-test-plan.md`);
}

function specFileFor(planPath) {
  return path.join(ROOT, 'tests', 'generated',
    `${path.basename(planPath, '.md')}.test.js`);
}

// ── Boot simulator if needed (macOS only) ─────────────────────────────────────
function ensureSimulatorBooted() {
  if (!IS_MACOS) return;

  const simList = spawnSync('xcrun', ['simctl', 'list', 'devices', 'booted'], { encoding: 'utf8' });
  const booted  = (simList.stdout || '').split('\n').filter(l => l.includes('Booted'));

  if (booted.length === 0) {
    log('sim', `Booting simulator: ${DEVICE_NAME}`);
    const boot = spawnSync('xcrun', ['simctl', 'boot', DEVICE_NAME], {
      stdio: 'inherit', encoding: 'utf8', shell: false,
    });
    if (boot.status !== 0) {
      console.warn(`⚠️  Could not boot "${DEVICE_NAME}" — is the name correct?`);
      console.warn('   Run: xcrun simctl list devices to see available simulators.');
    } else {
      log('sim', `✅ "${DEVICE_NAME}" booted`);
    }
  } else {
    log('sim', `Simulator already booted: ${booted[0].trim()}`);
  }
}

// ── Pipeline ───────────────────────────────────────────────────────────────────
async function run() {
  console.log(IOS_BANNER);

  try {
    checkPrerequisites();
  } catch (err) {
    console.warn(`⚠️  Pre-flight: ${err.message}`);
  }

  if (IS_MACOS) {
    ensureSimulatorBooted();
  } else {
    log('info', 'Running on non-macOS — targeting mobile-use.com cloud or skipping iOS sim steps.');
  }

  // ── STEP 1: PLANNER ─────────────────────────────────────────────────────────
  banner('🎭 Step 1 · PLANNER AGENT');
  log('planner', `Planning tests for ${TARGET_URL} on iOS`);

  const planExit = runAgent('agents/planner.js', [
    `--url=${TARGET_URL}`,
    '--platform=ios',
  ]);

  if (planExit !== 0) {
    throw new Error(`Planner agent exited with code ${planExit}`);
  }

  const planPath = planFileFor(TARGET_URL);
  if (!fs.existsSync(planPath)) {
    throw new Error(`Expected plan file not found: ${planPath}`);
  }
  log('planner', `✅ Plan ready: ${planPath}`);

  // ── STEP 2: GENERATOR ───────────────────────────────────────────────────────
  banner('🎭 Step 2 · GENERATOR AGENT');
  log('generator', 'Generating Mobilewright spec from plan …');

  const genExit = runAgent('agents/generator.js', [
    `--plan=${planPath}`,
    '--platform=ios',
  ]);

  if (genExit !== 0) {
    throw new Error(`Generator agent exited with code ${genExit}`);
  }

  const specPath = specFileFor(planPath);
  if (!fs.existsSync(specPath)) {
    throw new Error(`Expected spec file not found: ${specPath}`);
  }
  log('generator', `✅ Spec ready: ${specPath}`);

  // ── STEP 3: HEALER ──────────────────────────────────────────────────────────
  banner('🎭 Step 3 · HEALER AGENT');
  log('healer', `Executing tests and auto-healing (max ${MAX_RETRIES} cycles) …`);

  const healExit = runAgent('agents/healer.js', [
    `--spec=${specPath}`,
    '--platform=ios',
    `--retries=${MAX_RETRIES}`,
  ]);

  // ── Summary ──────────────────────────────────────────────────────────────────
  banner('📊 Pipeline Complete');
  if (healExit === 0) {
    console.log('  🟢  ALL TESTS PASSED on iOS');
  } else {
    console.log('  🔴  Some tests still failing — check reports/ for details');
  }
  console.log(`  Plan  : ${planPath}`);
  console.log(`  Spec  : ${specPath}`);
  console.log(`  Report: ${path.join(ROOT, 'reports')}`);
  console.log('');

  process.exit(healExit);
}

run().catch(err => {
  console.error('\n❌ [iOS Orchestrator] Unhandled error:', err.message);
  process.exit(1);
});
