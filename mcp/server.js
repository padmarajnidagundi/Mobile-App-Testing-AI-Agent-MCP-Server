#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const z = require('zod/v4');

const repoRoot = path.join(__dirname, '..');

function runNodeScript(scriptRelativePath, args = [], timeoutMs = 300000) {
  const scriptPath = path.join(repoRoot, scriptRelativePath);
  const result = spawnSync('node', [scriptPath, ...args], {
    cwd: repoRoot,
    shell: true,
    encoding: 'utf8',
    timeout: timeoutMs,
  });

  return {
    scriptPath,
    exitCode: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function textResult(payload) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

const server = new McpServer({
  name: 'mobile-testing-ai-agent-mcp-server',
  version: '1.0.0',
});

server.registerTool(
  'health_check',
  {
    description: 'Get basic MCP server and environment health information.',
    inputSchema: {
      verbose: z.boolean().optional().describe('Include cwd and platform details.'),
    },
  },
  async ({ verbose }) => {
    const payload = {
      status: 'ok',
      server: 'mobile-testing-ai-agent-mcp-server',
      version: '1.0.0',
      node: process.version,
      timestamp: new Date().toISOString(),
    };

    if (verbose) {
      payload.cwd = repoRoot;
      payload.platform = process.platform;
      payload.arch = process.arch;
    }

    return textResult(payload);
  }
);

server.registerTool(
  'run_planner',
  {
    description: 'Run Planner agent to generate a Markdown test plan from a target URL.',
    inputSchema: {
      url: z.string().url().describe('Target URL to explore.'),
      platform: z.enum(['web', 'android', 'ios']).default('web').describe('Target platform.'),
      outDir: z.string().optional().describe('Optional output directory for generated plan files.'),
    },
  },
  async ({ url, platform, outDir }) => {
    const args = [`--url=${url}`, `--platform=${platform}`];
    if (outDir) args.push(`--out=${outDir}`);

    const result = runNodeScript(path.join('agents', 'planner.js'), args);
    return textResult(result);
  }
);

server.registerTool(
  'run_generator',
  {
    description: 'Run Generator agent to create executable tests from a Markdown plan.',
    inputSchema: {
      plan: z.string().describe('Path to the plan Markdown file.'),
      platform: z.enum(['web', 'android', 'ios']).default('web').describe('Target platform.'),
      outDir: z.string().optional().describe('Optional output directory for generated tests.'),
    },
  },
  async ({ plan, platform, outDir }) => {
    const args = [`--plan=${plan}`, `--platform=${platform}`];
    if (outDir) args.push(`--out=${outDir}`);

    const result = runNodeScript(path.join('agents', 'generator.js'), args);
    return textResult(result);
  }
);

server.registerTool(
  'run_healer',
  {
    description: 'Run Healer agent to execute and auto-repair failing tests.',
    inputSchema: {
      spec: z.string().describe('Path to the test spec file.'),
      platform: z.enum(['web', 'android', 'ios']).default('web').describe('Target platform.'),
      retries: z.number().int().min(1).max(10).default(3).describe('Maximum healer retry cycles.'),
    },
  },
  async ({ spec, platform, retries }) => {
    const args = [`--spec=${spec}`, `--platform=${platform}`, `--retries=${retries}`];
    const result = runNodeScript(path.join('agents', 'healer.js'), args, 600000);
    return textResult(result);
  }
);

server.registerTool(
  'run_orchestrator',
  {
    description: 'Run Android or iOS orchestration pipeline (Planner -> Generator -> Healer).',
    inputSchema: {
      platform: z.enum(['android', 'ios']).describe('Mobile platform to orchestrate.'),
      url: z.string().url().default('https://uselessweb.org/').describe('Target URL to validate.'),
      retries: z.number().int().min(1).max(10).default(3).describe('Maximum healer retries in orchestration.'),
      iosDevice: z.string().optional().describe('Optional iOS device name for iOS orchestrator only.'),
    },
  },
  async ({ platform, url, retries, iosDevice }) => {
    const script = platform === 'android'
      ? path.join('orchestrators', 'android-orchestrator.js')
      : path.join('orchestrators', 'ios-orchestrator.js');

    const args = [`--url=${url}`, `--retries=${retries}`];
    if (platform === 'ios' && iosDevice) {
      args.push(`--device=${iosDevice}`);
    }

    const result = runNodeScript(script, args, 900000);
    return textResult(result);
  }
);

server.registerTool(
  'list_repo_commands',
  {
    description: 'Return frequently used npm commands for this repository.',
  },
  async () => {
    return textResult({
      commands: [
        'npm run test:web',
        'npm run test:android',
        'npm run test:ios',
        'npm run agent:planner',
        'npm run agent:generator',
        'npm run agent:healer',
        'npm run orchestrate:android',
        'npm run orchestrate:ios',
        'npm run mcp:start',
      ],
    });
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] mobile-testing-ai-agent-mcp-server is running on stdio');
}

main().catch((error) => {
  console.error('[MCP] Fatal server error:', error);
  process.exit(1);
});
