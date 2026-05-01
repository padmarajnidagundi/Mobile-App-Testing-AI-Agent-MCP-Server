/**
 * 🤖 ANDROID ORCHESTRATION AGENT
 * ─────────────────────────────────────────────────────────────────────────────
 * Drives the full AI-testing pipeline for Android devices / emulators:
 *
 *   1. 🎭 Planner   → analyses target URL and writes a Markdown test plan
 *   2. 🎭 Generator → converts the plan into a Mobilewright spec file
 *   3. 🎭 Healer    → executes tests and auto-repairs failures (up to N cycles)
 *
 * Usage:
 *   node orchestrators/android-orchestrator.js
 *   node orchestrators/android-orchestrator.js --url https://uselessweb.org/ --retries 3
 *
 * Environment:
 *   OPENAI_API_KEY   — required for AI-powered plan + heal steps
 *   ANDROID_HOME     — Android SDK path (required for real device / emulator)
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

const TARGET_URL  = args.url     || 'https://uselessweb.org/';
const MAX_RETRIES = args.retries || '3';
const ROOT        = path.join(__dirname, '..');

// ── Pretty logging ─────────────────────────────────────────────────────────────
const ANDROID_BANNER = `
╔══════════════════════════════════════════════════════════════╗
║        🤖  ANDROID ORCHESTRATION AGENT  🤖                   ║
║  Target : ${TARGET_URL.padEnd(50)}║
║  Pipeline: Planner → Generator → Healer                      ║
╚══════════════════════════════════════════════════════════════╝
`.trim();

function log(step, msg) {
  const ts = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${ts}] [Android/${step}] ${msg}`);
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
  const cmd        = ['node', scriptPath, ...extraArgs];

  log('runner', `Executing: ${cmd.join(' ')}`);

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
  checks.push({ name: 'OPENAI_API_KEY',  ok: hasKey, hint: hasKey ? 'set' : '⚠️  not set (AI features disabled)' });

  // mobilewright installed
  try {
    require.resolve('mobilewright', { paths: [ROOT] });
    checks.push({ name: 'mobilewright', ok: true, hint: 'installed' });
  } catch {
    checks.push({ name: 'mobilewright', ok: false, hint: 'run: npm install mobilewright' });
  }

  // mobilecli (ADB bridge)
  const mobilecli = spawnSync('mobilecli', ['--version'], { encoding: 'utf8', shell: true });
  checks.push({
    name: 'mobilecli',
    ok: mobilecli.status === 0,
    hint: mobilecli.status === 0 ? mobilecli.stdout.trim() : '⚠️  not found (install mobilecli)',
  });

  // ADB
  const adb = spawnSync('adb', ['version'], { encoding: 'utf8', shell: true });
  checks.push({
    name: 'ADB',
    ok: adb.status === 0,
    hint: adb.status === 0 ? 'available' : '⚠️  not found — install Android Platform Tools',
  });

  // Connected Android devices
  const devices = spawnSync('adb', ['devices'], { encoding: 'utf8', shell: true });
  const deviceLines = (devices.stdout || '').split('\n').filter(l => l.includes('device') && !l.includes('List'));
  checks.push({
    name: 'Android device',
    ok: deviceLines.length > 0,
    hint: deviceLines.length > 0 ? `${deviceLines.length} device(s) online` : '⚠️  no devices — start emulator or connect device',
  });

  let allOk = true;
  for (const c of checks) {
    const icon = c.ok ? '✅' : '⚠️ ';
    console.log(`  ${icon}  ${c.name.padEnd(25)} ${c.hint}`);
    if (!c.ok && c.name !== 'OPENAI_API_KEY' && c.name !== 'ADB' && c.name !== 'Android device') {
      allOk = false;
    }
  }

  console.log('');
  if (!allOk) {
    throw new Error('Critical prerequisites not met. Fix the issues above and re-run.');
  }
}

// ── Derive plan & spec paths ───────────────────────────────────────────────────
function planFileFor(url) {
  const slug = url.replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  return path.join(ROOT, 'plans', `${slug}-android-test-plan.md`);
}

function specFileFor(planPath) {
  return path.join(ROOT, 'tests', 'generated',
    `${path.basename(planPath, '.md')}.test.js`);
}

// ── Pipeline ───────────────────────────────────────────────────────────────────
async function run() {
  console.log(ANDROID_BANNER);

  try {
    checkPrerequisites();
  } catch (err) {
    console.warn(`⚠️  Pre-flight: ${err.message}`);
    // continue anyway (some checks are warnings)
  }

  // ── STEP 1: PLANNER ─────────────────────────────────────────────────────────
  banner('🎭 Step 1 · PLANNER AGENT');
  log('planner', `Planning tests for ${TARGET_URL} on Android`);

  const planExit = runAgent('agents/planner.js', [
    `--url=${TARGET_URL}`,
    '--platform=android',
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
    '--platform=android',
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
    '--platform=android',
    `--retries=${MAX_RETRIES}`,
  ]);

  // ── Summary ──────────────────────────────────────────────────────────────────
  banner('📊 Pipeline Complete');
  if (healExit === 0) {
    console.log('  🟢  ALL TESTS PASSED on Android');
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
  console.error('\n❌ [Android Orchestrator] Unhandled error:', err.message);
  process.exit(1);
});
