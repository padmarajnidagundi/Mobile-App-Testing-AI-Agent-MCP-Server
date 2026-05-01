# Mobile App Testing AI Agent MCP Server

## Project Overview
This repository provides an AI-powered test automation framework for web and mobile validation using:

- Planner Agent: explores a target app or site and generates a structured Markdown test plan.
- Generator Agent: converts the Markdown test plan into executable Playwright or Mobilewright tests.
- Healer Agent: runs tests, detects failures, and attempts automated repair cycles.
- Android and iOS Orchestrators: run Planner -> Generator -> Healer as end-to-end pipelines for each platform.
- MCP Server: exposes the framework as callable MCP tools over stdio for AI clients.

The framework is designed to accelerate test authoring, improve test stability, and provide an extensible baseline for AI-assisted QA workflows.

## Quick Setup (One Command)
For a fast web-ready setup:

```bash
npm install && npx playwright install chromium
```

Then run the default web test:

```bash
npm run test:web
```

Optional environment setup:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Dependencies
### Required
- Node.js 18+
- npm 9+
- Playwright Chromium browser

### Core NPM packages
- mobilewright
- @playwright/test
- playwright
- @modelcontextprotocol/sdk
- zod
- openai
- dotenv
- fs-extra
- chalk
- axios
- cheerio

### Platform prerequisites
#### Web
- No additional setup after installing dependencies and Chromium.

#### Android
- Android SDK installed
- ADB available on PATH
- ANDROID_HOME configured
- At least one connected Android device or emulator

Useful checks:

```bash
npm run doctor
npm run devices
```

#### iOS
- macOS host for local iOS automation
- Xcode + Command Line Tools
- Booted iOS Simulator (or compatible cloud/mobile device provider)

## Repository Structure
```text
Mobile-App-Testing-AI-Agent-MCP-Server/
├── agents/
│   ├── planner.js
│   ├── generator.js
│   └── healer.js
├── mcp/
│   └── server.js
├── orchestrators/
│   ├── android-orchestrator.js
│   └── ios-orchestrator.js
├── tests/
│   ├── generated/
│   └── uselessweb/
│       ├── uselessweb.spec.js
│       ├── uselessweb-android.test.js
│       └── uselessweb-ios.test.js
├── plans/
│   └── uselessweb-org--web-test-plan.md
├── reports/
├── mobilewright.config.js
├── playwright.config.js
├── .env.example
└── package.json
```

### What each area does
- agents: AI agent implementations for planning, generation, and healing.
- mcp: stdio MCP server exposing planner, generator, healer, and orchestrator tools.
- orchestrators: platform-specific pipeline runners for Android and iOS.
- tests: executable specs, including generated tests and curated examples.
- plans: Markdown test plans used as source input for code generation.
- reports: test and healing run artifacts.

## Usage Guide
### 1. Run web test suite
```bash
npm run test:web
```

### 2. Run mobile viewport projects in Playwright
```bash
npm run test:mobile-chrome
npm run test:mobile-safari
```

### 3. Run Android or iOS Mobilewright tests
```bash
npm run test:android
npm run test:ios
```

### 4. Use individual AI agents
#### Planner
```bash
npm run agent:planner
npm run agent:planner:android
npm run agent:planner:ios
```

Direct CLI example:

```bash
node agents/planner.js --url=https://uselessweb.org/ --platform=web --out=plans/
```

#### Generator
```bash
npm run agent:generator
npm run agent:generator:android
npm run agent:generator:ios
```

Direct CLI example:

```bash
node agents/generator.js --plan=plans/uselessweb-org--web-test-plan.md --platform=web --out=tests/generated/
```

#### Healer
```bash
npm run agent:healer
npm run agent:healer:android
npm run agent:healer:ios
```

Direct CLI example:

```bash
node agents/healer.js --spec=tests/uselessweb/uselessweb.spec.js --platform=web --retries=3
```

### 5. Add a new test with Android and iOS agents
Use this flow when you want to create tests for a new target URL.

#### Android agent flow (plan -> generate -> run -> heal)
1. Generate an Android test plan:

```bash
node agents/planner.js --url=https://uselessweb.org --platform=android --out=plans/
```

2. Generate Android tests from the plan:

```bash
node agents/generator.js --plan=plans/example-com-android-test-plan.md --platform=android --out=tests/generated/
```

3. Run the generated Android test:

```bash
npx mobilewright test tests/generated/example-com-android-test-plan.test.js
```

4. Auto-heal failing Android tests:

```bash
node agents/healer.js --spec=tests/generated/example-com-android-test-plan.test.js --platform=android --retries=3
```

#### iOS agent flow (plan -> generate -> run -> heal)
1. Generate an iOS test plan:

```bash
node agents/planner.js --url=https://uselessweb.org --platform=ios --out=plans/
```

2. Generate iOS tests from the plan:

```bash
node agents/generator.js --plan=plans/example-com-ios-test-plan.md --platform=ios --out=tests/generated/
```

3. Run the generated iOS test:

```bash
npx mobilewright test tests/generated/example-com-ios-test-plan.test.js
```

4. Auto-heal failing iOS tests:

```bash
node agents/healer.js --spec=tests/generated/example-com-ios-test-plan.test.js --platform=ios --retries=3
```

#### Optional: use orchestrators instead of running each step manually
```bash
npm run orchestrate:android -- --url=https://uselessweb.org --retries=3
npm run orchestrate:ios -- --url=https://uselessweb.org --retries=3
```

### 6. Run orchestration pipelines
#### Android pipeline
```bash
npm run orchestrate:android
```

#### iOS pipeline
```bash
npm run orchestrate:ios
```

### 7. Run complete web AI pipeline
```bash
npm run pipeline:web
```

This executes Planner -> Generator -> Healer for web.

### 8. Start the MCP server
```bash
npm run mcp:start
```

The server runs on stdio and exposes tools including:

- health_check
- run_planner
- run_generator
- run_healer
- run_orchestrator
- list_repo_commands

### 9. Inspect MCP tools locally
```bash
npm run mcp:inspect
```

### 10. Example MCP client configuration
Use this in an MCP-capable client configuration file:

```json
{
   "mcpServers": {
      "mobile-testing-ai-agent": {
         "command": "node",
         "args": ["mcp/server.js"],
         "cwd": "."
      }
   }
}
```

## Contributing
Contributions are welcome. Please follow the workflow below:

1. Fork the repository.
2. Create a feature branch from main.
3. Keep changes focused and well-scoped.
4. Add or update tests for new behavior.
5. Run relevant checks before opening a PR:
   - npm run test:web
   - npm run test:all
   - npm run doctor (for mobile environments)
6. Open a pull request with:
   - clear problem statement
   - implementation summary
   - validation evidence (logs, test output, screenshots where useful)

### Contribution guidelines
- Prefer small, reviewable pull requests.
- Avoid unrelated refactors in the same PR.
- Preserve script and folder naming conventions.
- Document new commands and agent behaviors in this README.

## Acknowledgements
This project is built on top of the excellent Mobilewright ecosystem.

- Mobilewright framework: https://github.com/mobile-next/mobilewright
- Mobilewright documentation: https://mobilewright.dev

Special thanks to the Mobilewright maintainers and contributors for enabling practical mobile automation workflows across Android and iOS.

## License
ISC


## Questions?

If you have any questions:
- 💬 Open a [GitHub Discussion](https://github.com/padmarajnidagundi/Playwright-AI-Agent-POM-MCP-Server/discussions)
- 🐛 Report bugs via [GitHub Issues](https://github.com/padmarajnidagundi/Playwright-AI-Agent-POM-MCP-Server/issues)
- 📧 Email: padmaraj dot nidagundi at gmail.com

**Response time:** Typically 24-48 hours

---

### First-Time Contributors Welcome! 👋

New to open source? No problem! Look for issues tagged with `good-first-issue` or `help-wanted`. We provide mentorship and guidance to help you succeed.

**Thank you for making test automation better for everyone!** 🚀
