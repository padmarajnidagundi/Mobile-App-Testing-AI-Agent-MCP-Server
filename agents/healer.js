/**
 * 🎭 HEALER AGENT
 * ─────────────────────────────────────────────────────────────────────────────
 * Executes the Playwright / Mobilewright test suite, captures failures, feeds
 * each failing test + error to an LLM, receives a corrected test, patches the
 * spec file in-place, and re-runs. Repeats up to MAX_RETRIES cycles.
 *
 * Usage:
 *   node agents/healer.js --spec tests/uselessweb/uselessweb.spec.js
 *   node agents/healer.js --spec tests/generated/foo-android-test-plan.test.js --platform android
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const OpenAI                  = require('openai');
const fs                      = require('fs');
const path                    = require('path');
const dotenv                  = require('dotenv');

dotenv.config();

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => a.replace('--', '').split('='))
    .map(([k, ...v]) => [k, v.join('=') || true])
);

const SPEC_FILE  = args.spec || path.join(__dirname, '..', 'tests', 'uselessweb', 'uselessweb.spec.js');
const PLATFORM   = args.platform || 'web';   // web | android | ios
const MAX_RETRIES = parseInt(args.retries || '3', 10);
const REPORT_DIR  = path.join(__dirname, '..', 'reports');

// ── OpenAI client ─────────────────────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY_HERE',
});

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Run tests and capture output ──────────────────────────────────────────────
function runTests(specFile) {
  console.log(`\n▶  [Healer] Running: npx playwright test ${specFile}`);

  const runner = PLATFORM === 'web' ? 'playwright' : 'mobilewright';

  const result = spawnSync(
    'npx',
    [runner, 'test', specFile, '--reporter=json', '--output', REPORT_DIR],
    {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      timeout: 120_000,
      shell: true,
    }
  );

  return {
    stdout:   result.stdout || '',
    stderr:   result.stderr || '',
    exitCode: result.status ?? 1,
  };
}

// ── Parse failures from JSON reporter output ───────────────────────────────────
function parseFailures(stdout, stderr) {
  const failures = [];

  // Try JSON first
  const jsonMatch = stdout.match(/\{[\s\S]*"suites"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const report = JSON.parse(jsonMatch[0]);
      const walk = (suite) => {
        for (const test of suite.specs || []) {
          for (const result of test.tests || []) {
            for (const r of result.results || []) {
              if (r.status === 'failed' || r.status === 'timedOut') {
                failures.push({
                  title:  test.title,
                  error:  r.error?.message || 'Unknown error',
                  stack:  r.error?.stack   || '',
                  file:   test.file || specFile,
                });
              }
            }
          }
        }
        for (const child of suite.suites || []) walk(child);
      };
      walk(report);
      return failures;
    } catch (_) { /* fall through to text parsing */ }
  }

  // Fallback: parse text output for FAILED markers
  const lines = (stdout + '\n' + stderr).split('\n');
  let current = null;
  for (const line of lines) {
    if (/✗|×|FAILED|failed/i.test(line) && line.includes('·')) {
      current = { title: line.trim(), error: '', stack: '', file: SPEC_FILE };
      failures.push(current);
    } else if (current && /Error:|expect\(|Timeout/i.test(line)) {
      current.error += line + '\n';
    }
  }

  return failures;
}

// ── Ask LLM to fix a failing test ─────────────────────────────────────────────
async function healTest(specContent, failure) {
  const system = `
You are an expert Playwright / Mobilewright test engineer.
You will receive:
1. The full spec file content.
2. The title of the failing test.
3. The error message / stack trace.

Your job:
- Identify the root cause of the failure.
- Return the COMPLETE corrected spec file with the fix applied.
- Do NOT change passing tests; only fix the failing one.
- Keep the fix minimal and targeted.
- Output ONLY the corrected JavaScript file — no prose, no markdown fences.
`.trim();

  const user = `
=== SPEC FILE ===
${specContent}

=== FAILING TEST ===
Title : ${failure.title}
Error : ${failure.error}
Stack : ${failure.stack}

Return the full corrected spec file now.
`.trim();

  const completion = await openai.chat.completions.create({
    model:    'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: user   },
    ],
    temperature: 0.2,
    max_tokens:  4096,
  });

  let fixed = completion.choices[0].message.content.trim();
  fixed = fixed.replace(/^```(?:javascript|js|typescript|ts)?\n?/i, '').replace(/```\s*$/, '');
  return fixed;
}

// ── Write heal report ──────────────────────────────────────────────────────────
function writeReport(cycle, failures, healed, specFile) {
  ensureDir(REPORT_DIR);
  const ts   = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(REPORT_DIR, `heal-report-${ts}.md`);
  const lines = [
    `# Healer Agent Report — Cycle ${cycle}`,
    `**Spec:** ${specFile}`,
    `**Date:** ${new Date().toISOString()}`,
    '',
    `## Failures Found: ${failures.length}`,
    ...failures.map(f => `- **${f.title}**: ${f.error.split('\n')[0]}`),
    '',
    `## Healed: ${healed.length}`,
    ...healed.map(h => `- ${h}`),
  ];
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log(`📄 [Healer] Report written: ${file}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log('🎭 HEALER AGENT — Starting');
    console.log(`   Spec     : ${SPEC_FILE}`);
    console.log(`   Platform : ${PLATFORM}`);
    console.log(`   Max retries: ${MAX_RETRIES}`);

    if (!fs.existsSync(SPEC_FILE)) {
      throw new Error(`Spec file not found: ${SPEC_FILE}`);
    }

    ensureDir(REPORT_DIR);

    const hasApiKey = process.env.OPENAI_API_KEY &&
                      process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE';

    for (let cycle = 1; cycle <= MAX_RETRIES; cycle++) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`🔄 [Healer] Cycle ${cycle} / ${MAX_RETRIES}`);
      console.log('═'.repeat(60));

      const { stdout, stderr, exitCode } = runTests(SPEC_FILE);

      if (exitCode === 0) {
        console.log('\n✅ [Healer] All tests pass! No healing needed.');
        writeReport(cycle, [], [], SPEC_FILE);
        process.exit(0);
      }

      const failures = parseFailures(stdout, stderr);
      console.log(`\n⚠️  [Healer] ${failures.length} failure(s) detected.`);
      failures.forEach((f, i) => console.log(`   ${i + 1}. ${f.title}: ${f.error.split('\n')[0]}`));

      if (!hasApiKey) {
        console.warn('\n⚠️  OPENAI_API_KEY not set — cannot auto-heal. Logging failures only.');
        writeReport(cycle, failures, [], SPEC_FILE);
        console.log('\n📋 Fix the above failures manually and re-run the Healer.');
        process.exit(1);
      }

      // Heal each failure
      const healed = [];
      let specContent = fs.readFileSync(SPEC_FILE, 'utf8');

      for (const failure of failures) {
        console.log(`\n🩹 [Healer] Attempting to fix: "${failure.title}"`);
        try {
          const fixedSpec = await healTest(specContent, failure);
          if (fixedSpec && fixedSpec.length > 100) {
            specContent = fixedSpec;
            healed.push(failure.title);
            console.log(`   ✓ Fix generated for: "${failure.title}"`);
          }
        } catch (err) {
          console.warn(`   ✗ Could not generate fix for "${failure.title}": ${err.message}`);
        }
      }

      if (healed.length > 0) {
        // Backup original
        const backupPath = `${SPEC_FILE}.backup-cycle${cycle}`;
        fs.copyFileSync(SPEC_FILE, backupPath);
        console.log(`\n💾 [Healer] Backup saved: ${backupPath}`);

        // Write healed spec
        fs.writeFileSync(SPEC_FILE, specContent, 'utf8');
        console.log(`✏️  [Healer] Spec patched: ${SPEC_FILE}`);
      }

      writeReport(cycle, failures, healed, SPEC_FILE);

      if (healed.length === 0) {
        console.log('\n⚠️  [Healer] No automatic fixes could be applied. Manual intervention needed.');
        process.exit(1);
      }
    }

    console.log(`\n⚠️  [Healer] Reached max retries (${MAX_RETRIES}). Some tests may still be failing.`);
    process.exit(1);
  } catch (err) {
    console.error('❌ [Healer] Fatal error:', err.message);
    process.exit(1);
  }
})();
