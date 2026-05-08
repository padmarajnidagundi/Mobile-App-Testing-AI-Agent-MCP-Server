# Mobile Testing and Mobile Automation AI Agent MCP Server

## Native mobile app testing for iOS & Android Real Devices

Mobile testing, mobile automation, mobile QA, and mobile test automation framework powered by AI agents and MCP tooling.

## Project Overview: Mobile Testing, Mobile Automation, and Mobile QA
This repository provides an AI-powered framework for mobile testing and mobile test automation (plus web validation) using:

- Planner Agent: explores a target app or site and generates a structured Markdown test plan for mobile QA.
- Generator Agent: converts the Markdown test plan into executable Playwright or Mobilewright tests for mobile automation workflows.
- Healer Agent: runs tests, detects failures, and attempts automated repair cycles to improve mobile test automation stability.
- Android and iOS Orchestrators: run Planner -> Generator -> Healer as end-to-end pipelines for each platform and mobile testing lifecycle.
- MCP Server: exposes the framework as callable MCP tools over stdio for AI clients and automation platforms.

The framework is designed to accelerate mobile test authoring, improve test stability, and provide an extensible baseline for AI-assisted mobile QA workflows.

## Native Development Framework Support Matrix

The automation stack runs against Android and iOS app binaries/devices. In practice, this means support is based on platform runtime behavior rather than only the app framework.

| Native app development framework | Support status | Notes |
| --- | --- | --- |
| Android native (Kotlin/Java) | Supported | Run with the Android Mobilewright flow (`npm run test:android` / Android orchestrator). |
| iOS native (Swift/Objective-C) | Supported | Run with the iOS Mobilewright flow (`npm run test:ios` / iOS orchestrator). |
| React Native | Supported (via Android/iOS builds) | Test the compiled Android/iOS app using platform-specific selectors and flows. |
| Flutter | Supported (via Android/iOS builds) | Works through generated native app binaries on Android/iOS devices/simulators. |
| .NET MAUI / Xamarin | Supported (via Android/iOS builds) | Use Android/iOS pipelines after producing platform app builds. |
| Ionic / Cordova / Capacitor | Supported (via Android/iOS builds) | Treat as mobile app binaries; use web-context selectors where applicable. |

Notes:
- This project currently provides platform orchestrators for Android and iOS.
- Framework support is validated at runtime through the produced Android/iOS app package and testability of UI selectors.

## Quick Setup for Mobile Test Automation (One Command)
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

## Dependencies for Mobile Automation and Mobile QA
### Required
- Node.js 20.18.1+ (recommended to satisfy current package engine requirements)
- npm 9+
- Playwright Chromium browser

### Core NPM packages
- mobilewright ^0.0.33
- @playwright/test ^1.59.1
- playwright ^1.59.1
- @modelcontextprotocol/sdk ^1.29.0
- zod ^4.4.3
- openai ^6.37.0
- dotenv ^17.4.2
- fs-extra ^11.3.5
- chalk ^5.6.2
- axios ^1.16.0
- cheerio ^1.2.0

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

## Repository Structure for Mobile Testing Projects
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

### What each area does for mobile testing and automation
- agents: AI agent implementations for planning, generation, and healing in mobile test automation pipelines.
- mcp: stdio MCP server exposing planner, generator, healer, and orchestrator tools.
- orchestrators: platform-specific pipeline runners for Android and iOS mobile automation.
- tests: executable specs, including generated tests and curated examples for mobile QA.
- plans: Markdown test plans used as source input for code generation.
- reports: mobile testing and healing run artifacts.

## Usage Guide for Mobile Testing and Mobile QA
### 1. Run web test suite
```bash
npm run test:web
```

### 2. Run mobile viewport projects in Playwright (mobile testing)
```bash
npm run test:mobile-chrome
npm run test:mobile-safari
```

### 3. Run Android or iOS Mobilewright tests for mobile automation
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

### 5. Add a new test with Android and iOS agents (mobile test automation flow)
Use this flow when you want to create tests for a new target URL in your mobile QA process.

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

### 6. Run orchestration pipelines for mobile automation
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

### 7b. Run complete mobile QA pipelines
For end-to-end mobile test automation on each platform:

```bash
npm run orchestrate:android
npm run orchestrate:ios
```

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

### 11. CI/CD pipeline (GitHub Actions)
This repository now includes a CI/CD workflow at .github/workflows/ci-cd.yml.

CI behavior:
- Runs on pushes to main and pull requests targeting main.
- Installs dependencies with npm ci.
- Installs Playwright Chromium.
- Executes the web suite with npm run test:web.
- Uploads Playwright report artifacts when available.

CD behavior:
- Runs after CI on pushes to main.
- Triggers deployment only if DEPLOY_WEBHOOK_URL is configured as a repository secret.
- Safely skips deployment when the secret is not set.

To enable deployment, add this repository secret:
- DEPLOY_WEBHOOK_URL

## Contributing to Mobile Testing and Mobile Automation
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

## Mobile Testing FAQ (SEO)

### What is mobile test automation?
Mobile test automation is the practice of using tools and scripts to validate mobile apps and mobile web experiences automatically across Android and iOS.

### How does this repository help with mobile QA?
This project supports mobile QA with AI-driven planning, test generation, and self-healing execution, plus Android and iOS orchestration flows.

### Is this suitable for mobile automation teams?
Yes. It is built for teams that need scalable mobile automation, repeatable test pipelines, and faster feedback cycles for releases.

### Which mobile testing keywords does this framework target?
This framework focuses on practical workflows for mobile testing, mobile automation, mobile QA, and mobile test automation.


## Questions?

If you have any questions:
- 💬 Open a [GitHub Discussion](https://github.com/padmarajnidagundi/Playwright-AI-Agent-POM-MCP-Server/discussions)
- 🐛 Report bugs via [GitHub Issues](https://github.com/padmarajnidagundi/Playwright-AI-Agent-POM-MCP-Server/issues)
- 📧 Email: padmaraj dot nidagundi at gmail.com

**Response time:** Typically 24-48 hours

---

### First-Time Contributors Welcome! 👋👋👋👋👋👋

New to open source? No problem! Look for issues tagged with `good-first-issue` or `help-wanted`. We provide mentorship and guidance to help you succeed.

**Thank you for making test automation better for everyone!** 🚀
