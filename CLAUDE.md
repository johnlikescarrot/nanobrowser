# CLAUDE.md

This file provides guidance to AI coding assistants (e.g., Claude Code, GitHub Copilot, Cursor) when working with this repository.

## Project Overview

Nanobrowser is an open-source AI web automation Chrome extension that runs multi-agent systems locally in the browser. It's a free alternative to OpenAI Operator with support for multiple LLM providers (OpenAI, Anthropic, Gemini, Ollama, etc.).

## Development Commands

**Package Manager**: Always use `pnpm` (required, configured in Cursor rules)

**Core Commands**:

- `pnpm install` - Install dependencies
- `pnpm dev` - Start development mode with hot reload
- `pnpm build` - Build production version
- `pnpm type-check` - Run TypeScript type checking
- `pnpm lint` - Run ESLint with auto-fix
- `pnpm prettier` - Format code with Prettier

**Testing**:

- `pnpm e2e` - Run end-to-end tests (builds and zips first)
- `pnpm zip` - Create extension zip for distribution
- `pnpm -F chrome-extension test` - Run unit tests (Vitest) for core extension
  - Targeted example: `pnpm -F chrome-extension test -- -t "Sanitizer"`

### Workspace Tips

- Scope tasks to a single workspace to speed up runs:
  - `pnpm -F chrome-extension build`
  - `pnpm -F packages/ui lint`
- Prefer workspace-scoped commands over root-wide runs when possible.

Targeted examples (fast path):
- `pnpm -F pages/side-panel build` — build only the side panel
- `pnpm -F chrome-extension dev` — dev-watch background/service worker
- `pnpm -F packages/storage type-check` — TS checks for storage package
- `pnpm -F pages/side-panel lint -- src/components/ChatInput.tsx` — lint a file
- `pnpm -F chrome-extension prettier -- src/background/index.ts` — format a file

**Cleaning**:

- `pnpm clean` - Clean all build artifacts and node_modules
- `pnpm clean:bundle` - Clean just build outputs
- `pnpm clean:turbo` - Clear Turbo state/cache
- `pnpm clean:node_modules` - Remove dependencies in current workspace
- `pnpm clean:install` - Clean node_modules and reinstall dependencies
- `pnpm update-version` - Update version across all packages

## Architecture

This is a **monorepo** using **Turbo** for build orchestration and **pnpm workspaces**.

### Workspace Structure

**Core Extension**:

- `chrome-extension/` - Main Chrome extension manifest and background scripts
  - `src/background/` - Background service worker with multi-agent system
  - `src/background/agent/` - AI agent implementations (Navigator, Planner, Validator)
  - `src/background/browser/` - Browser automation and DOM manipulation

**UI Pages** (`pages/`):

- `side-panel/` - Main chat interface (React + TypeScript + Tailwind)
- `options/` - Extension settings page (React + TypeScript)
- `content/` - Content script for page injection

**Shared Packages** (`packages/`):

- `shared/` - Common utilities and types
- `storage/` - Chrome extension storage abstraction
- `ui/` - Shared React components
- `schema-utils/` - Validation schemas
- `i18n/` - Internationalization
- Others: `dev-utils/`, `zipper/`, `vite-config/`, `tailwind-config/`, `hmr/`,
  `tsconfig/`

### Multi-Agent System

The core AI system consists of three specialized agents:

- **Navigator** - Handles DOM interactions and web navigation
- **Planner** - High-level task planning and strategy
- **Validator** - Validates task completion and results

Agent logic is under `chrome-extension/src/background/agent/`.

### Build System

- **Turbo** manages task dependencies and caching
- **Vite** bundles each workspace independently
- **TypeScript** with strict configuration across all packages
- **ESLint** + **Prettier** for code quality
- Each workspace has its own `vite.config.mts` and `tsconfig.json`

### Key Technologies

- **Chrome Extension Manifest V3**
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for bundling
- **Puppeteer** for browser automation
- **Chrome APIs** for browser automation
- **LangChain.js** for LLM integration

## Development Notes

- Extension loads as unpacked from `dist/` directory after build
- Hot reload works in development mode via Vite HMR
- Background scripts run as service workers (Manifest V3)
- Content scripts inject into web pages for DOM access
- Multi-agent coordination happens through Chrome messaging APIs
- Distribution zips are written to `dist-zip/`
- Build flags: set `__DEV__=true` for watch builds; 
- Do not edit generated outputs: `dist/**`, `build/**`, `packages/i18n/lib/**`

## Unit Tests

- Framework: Vitest
- Location/naming: `chrome-extension/src/**/__tests__` with `*.test.ts`
- Run: `pnpm -F chrome-extension test`
- Targeted example: `pnpm -F chrome-extension test -- -t "Sanitizer"`
- Prefer fast, deterministic tests; mock network/browser APIs

## Testing Extension

After building, load the extension:

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` directory

## Internationalization (i18n)

### Key Naming Convention

Follow the structured naming pattern: `component_category_specificAction_state`

**Semantic Prefixes by Component:**

- `bg_` - Background service worker operations
- `exec_` - Executor/agent execution lifecycle
- `act_` - Agent actions and web automation
- `errors_` - Global error messages
- `options_` - Settings page components
- `chat_` - Chat interface elements
- `nav_` - Navigation elements
- `permissions_` - Permission-related messages

**State-Based Suffixes:**

- `_start` - Action beginning (e.g., `act_goToUrl_start`)
- `_ok` - Successful completion (e.g., `act_goToUrl_ok`)
- `_fail` - Failure state (e.g., `exec_task_fail`)
- `_cancel` - Cancelled operation
- `_pause` - Paused state

**Error Categorization:**

- `_errors_` subcategory for component-specific errors
- Global `errors_` prefix for system-wide errors
- Descriptive error names (e.g., `act_errors_elementNotExist`)

**Command Structure:**

- `_cmd_` for command-related messages (e.g., `bg_cmd_newTask_noTask`)
- `_setup_` for configuration issues (e.g., `bg_setup_noApiKeys`)

### Usage

```typescript
import { t } from '@extension/i18n';

// Simple message
t('bg_errors_noTabId')

// With placeholders
t('act_click_ok', ['5', 'Submit Button'])
```

### Placeholders

Use Chrome i18n placeholder format with proper definitions:

```json
{
  "act_goToUrl_start": {
    "message": "Navigating to $URL$",
    "placeholders": {
      "url": {
        "content": "$1",
        "example": "https://example.com"
      }
    }
  }
}
```

**Guidelines:**

- Use descriptive, self-documenting key names
- Separate user-facing strings from internal/log strings
- Follow hierarchical naming for maintainability
- Add placeholders with examples for dynamic content
- Group related keys by component prefix

### Generation

- Do not edit generated files under `packages/i18n/lib/**`.
- The generator `packages/i18n/genenrate-i18n.mjs` runs via the `@extension/i18n`
  workspace `ready`/`build` scripts to (re)generate types and runtime helpers.
  Edit source locale JSON in `packages/i18n/locales/**` instead.

## Code Quality Standards

### Development Principles

- **Simple but Complete Solutions**: Write straightforward, well-documented code that fully addresses requirements
- **Modular Design**: Structure code into focused, single-responsibility modules and functions
- **Testability**: Design components to be easily testable with clear inputs/outputs and minimal dependencies
- **Type Safety**: Leverage TypeScript's type system for better code reliability and maintainability

### Code Organization

- Extract reusable logic into utility functions or shared packages
- Use dependency injection for better testability
- Keep functions small and focused on a single task
- Prefer composition over inheritance
- Write self-documenting code with clear naming

### Style & Naming

- Formatting via Prettier (2 spaces, semicolons, single quotes,
  trailing commas, `printWidth: 120`)
- ESLint rules include React/Hooks/Import/A11y + TypeScript
- Components: `PascalCase`; variables/functions: `camelCase`;
  workspace/package directories: `kebab-case`
- Enforced rule: `@typescript-eslint/consistent-type-imports`
  (use `import type { ... } from '...'` for type-only imports)

### Quality Assurance

- Run `pnpm type-check` before committing to catch TypeScript errors
- Use `pnpm lint` to maintain code style consistency
- Write unit tests for business logic and utility functions
- Test UI components in isolation when possible

### Security Guidelines

- **Input Validation**: Always validate and sanitize user inputs, especially URLs, file paths, and form data
- **Credential Management**: Never log, commit, or expose API keys, tokens, or sensitive configuration
- **Content Security Policy**: Respect CSP restrictions and avoid `eval()` or dynamic code execution
- **Permission Principle**: Request minimal Chrome extension permissions required for functionality
- **Data Privacy**: Handle user data securely and avoid unnecessary data collection or storage
- **XSS Prevention**: Sanitize content before rendering, especially when injecting into web pages
- **URL Validation**: Validate and restrict navigation to prevent malicious redirects
- **Error Handling**: Avoid exposing sensitive information in error messages or logs
 - **Secrets/Config**: Use `.env.local` (git‑ignored) and prefix variables with `VITE_`.
   Example: `VITE_POSTHOG_API_KEY`. Vite in `chrome-extension/vite.config.mts` loads
   `VITE_*` from the parent directory.

## Important Reminders

- Always use `pnpm` package manager (required for this project)
- Node.js version: follow `.nvmrc` and `package.json` engines
- Use `nvm use` to match `.nvmrc` before installing
- `engine-strict=true` is enabled in `.npmrc`; non-matching engines fail install
- Turbo manages task dependencies and caching across workspaces
- Extension builds to `dist/` directory which is loaded as unpacked extension
- Zipped distributions are written to `dist-zip/`
- Only supports Chrome/Edge 
- Keep diffs minimal and scoped; avoid mass refactors or reformatting unrelated files
- Do not modify generated artifacts (`dist/**`, `build/**`, `packages/i18n/lib/**`)
  or workspace/global configs (`turbo.json`, `pnpm-workspace.yaml`, `tsconfig*`)
  without approval
 - Prefer workspace-scoped checks:
   `pnpm -F <workspace> type-check`, `pnpm -F <workspace> lint`,
   `pnpm -F <workspace> prettier -- <changed-file>`, and build if applicable
- Vite aliases: pages use `@src` for page `src/`; the extension uses
  `@root`, `@src`, `@assets` (see `chrome-extension/vite.config.mts`). Use
  `packages/vite-config`’s `withPageConfig` for page workspaces.
 - Only use scripts defined in `package.json`; do not invent new commands
 - Change policy: ask first for new deps, file renames/moves/deletes, or
   global/workspace config changes; allowed without asking: read/list files,
   workspace‑scoped lint/format/type-check/build, and small focused patches
 - Reuse existing building blocks: `packages/ui` components and
   `packages/tailwind-config` tokens instead of re-implementing

# Nanobrowser

Nanobrowser is an open-source AI web automation Chrome extension that runs multi-agent systems locally in your browser. It serves as a free alternative to OpenAI Operator, providing flexible LLM options with support for OpenAI, Anthropic, Gemini, Ollama, Groq, Cerebras, Llama, and custom OpenAI-compatible providers. The extension enables users to automate complex web workflows through natural language commands while maintaining complete control and privacy since everything runs locally.

The core architecture features a multi-agent system with specialized AI agents (Navigator and Planner) that collaborate to accomplish web automation tasks. The Navigator agent handles DOM interactions and web navigation, while the Planner agent manages high-level task planning and strategy. Built as a monorepo using Turbo for build orchestration and pnpm workspaces, it includes a React-based side panel interface for chat interactions, Chrome extension manifest V3 compliance, and LangChain.js integration for LLM connectivity.

## Installation and Setup

Build and load the extension from source for development.

```bash
# Prerequisites: Node.js v22.12.0+, pnpm v9.15.1+

# Clone and install
git clone https://github.com/nanobrowser/nanobrowser.git
cd nanobrowser
pnpm install

# Build for production
pnpm build

# Or run in development mode with hot reload
pnpm dev

# Create distribution zip
pnpm zip

# Run tests
pnpm -F chrome-extension test
```

## Executor API

The Executor class orchestrates the multi-agent system to execute web automation tasks.

```typescript
import { Executor } from './agent/executor';
import BrowserContext from './browser/context';
import { createChatModel } from './agent/helper';

// Initialize browser context
const browserContext = new BrowserContext({
  homePageUrl: 'https://www.google.com',
  allowedUrls: [],
  deniedUrls: [],
  displayHighlights: true,
  minimumWaitPageLoadTime: 0.5,
});

// Create LLM models for agents
const navigatorLLM = createChatModel(providerConfig, {
  provider: 'anthropic',
  modelName: 'claude-3-haiku-20240307',
});

const plannerLLM = createChatModel(providerConfig, {
  provider: 'anthropic',
  modelName: 'claude-sonnet-4-20250514',
});

// Create and configure executor
const executor = new Executor(
  'Find trending Python repositories on GitHub',  // task
  'task-123',                                      // taskId
  browserContext,
  navigatorLLM,
  {
    plannerLLM,
    agentOptions: {
      maxSteps: 100,
      maxActionsPerStep: 10,
      maxFailures: 3,
      useVision: true,
      useVisionForPlanner: true,
      planningInterval: 3,
    },
  }
);

// Subscribe to execution events
executor.subscribeExecutionEvents(async (event) => {
  console.log(`[${event.actor}] ${event.state}: ${event.details}`);
});

// Execute the task
await executor.execute();

// Add follow-up task
executor.addFollowUpTask('Now filter by stars > 1000');
await executor.execute();

// Control execution
await executor.pause();
await executor.resume();
await executor.cancel();

// Cleanup resources
await executor.cleanup();
```

## Chrome Extension Message API

The background service worker handles communication with the side panel through Chrome's port messaging.

```typescript
// Side panel connection setup
const port = chrome.runtime.connect({ name: 'side-panel-connection' });

// Send new task request
port.postMessage({
  type: 'new_task',
  taskId: 'task-' + Date.now(),
  task: 'Go to Amazon and find wireless headphones under $50',
  tabId: currentTabId,
});

// Send follow-up task
port.postMessage({
  type: 'follow_up_task',
  task: 'Now sort by customer ratings',
  tabId: currentTabId,
});

// Control task execution
port.postMessage({ type: 'pause_task' });
port.postMessage({ type: 'resume_task' });
port.postMessage({ type: 'cancel_task' });

// Request screenshot
port.postMessage({
  type: 'screenshot',
  tabId: currentTabId,
});

// Replay historical task
port.postMessage({
  type: 'replay',
  taskId: 'new-task-id',
  task: 'Original task description',
  tabId: currentTabId,
  historySessionId: 'previous-session-id',
});

// Speech-to-text transcription
port.postMessage({
  type: 'speech_to_text',
  audio: base64AudioData, // base64 encoded audio
});

// Listen for responses
port.onMessage.addListener((message) => {
  switch (message.type) {
    case 'success':
      console.log('Task completed:', message);
      break;
    case 'error':
      console.error('Task failed:', message.error);
      break;
    case 'speech_to_text_result':
      console.log('Transcribed:', message.text);
      break;
  }
});
```

## Navigator Agent Actions

The Navigator agent exposes a set of actions for web page interaction and automation.

```typescript
// Action schema definitions for Navigator agent

// Navigate to URL
const goToUrl = {
  name: 'go_to_url',
  input: { intent: 'Navigate to product page', url: 'https://example.com/products' }
};

// Google search
const searchGoogle = {
  name: 'search_google',
  input: { intent: 'Search for product', query: 'best wireless headphones 2024' }
};

// Click element by index
const clickElement = {
  name: 'click_element',
  input: { intent: 'Click add to cart button', index: 42 }
};

// Input text into form field
const inputText = {
  name: 'input_text',
  input: { intent: 'Enter search query', index: 15, text: 'wireless headphones' }
};

// Tab management
const switchTab = { name: 'switch_tab', input: { intent: 'Switch to results tab', tab_id: 123 } };
const openTab = { name: 'open_tab', input: { intent: 'Open in new tab', url: 'https://example.com' } };
const closeTab = { name: 'close_tab', input: { intent: 'Close current tab', tab_id: 123 } };

// Scroll actions
const nextPage = { name: 'next_page', input: { intent: 'Scroll to see more results' } };
const previousPage = { name: 'previous_page', input: { intent: 'Scroll back up' } };
const scrollToText = { name: 'scroll_to_text', input: { intent: 'Find reviews section', text: 'Customer Reviews', nth: 1 } };
const scrollToPercent = { name: 'scroll_to_percent', input: { intent: 'Scroll to middle', yPercent: 50 } };

// Dropdown interactions
const getOptions = { name: 'get_dropdown_options', input: { intent: 'Get sort options', index: 8 } };
const selectOption = { name: 'select_dropdown_option', input: { intent: 'Sort by price', index: 8, text: 'Price: Low to High' } };

// Keyboard actions
const sendKeys = { name: 'send_keys', input: { intent: 'Submit form', keys: 'Enter' } };

// Complete task
const done = { name: 'done', input: { text: 'Found 5 wireless headphones under $50', success: true } };
```

## BrowserContext API

The BrowserContext manages browser state, tab interactions, and page automation through Chrome APIs and Puppeteer.

```typescript
import BrowserContext from './browser/context';

// Initialize with configuration
const browserContext = new BrowserContext({
  homePageUrl: 'https://www.google.com',
  allowedUrls: ['*.amazon.com', '*.github.com'],
  deniedUrls: ['*.malicious.com'],
  displayHighlights: true,
  minimumWaitPageLoadTime: 0.5,
});

// Navigate to URL (respects allowed/denied lists)
await browserContext.navigateTo('https://github.com/trending');

// Tab management
const page = await browserContext.getCurrentPage();
const newPage = await browserContext.openTab('https://amazon.com');
await browserContext.switchTab(tabId);
await browserContext.closeTab(tabId);

// Get all open tabs
const tabIds = await browserContext.getAllTabIds();
const tabInfos = await browserContext.getTabInfos();
// Returns: [{ id: 123, url: 'https://...', title: 'Page Title' }, ...]

// Get browser state with DOM tree
const state = await browserContext.getState(useVision: true);
console.log(state.elementTree);  // Parsed DOM with interactive elements
console.log(state.tabs);          // Open tab information
console.log(state.url);           // Current URL
console.log(state.title);         // Page title

// Get cached state (faster, uses previous DOM parse)
const cachedState = await browserContext.getCachedState();

// Remove element highlights
await browserContext.removeHighlight();

// Update configuration at runtime
browserContext.updateConfig({
  displayHighlights: false,
  minimumWaitPageLoadTime: 1.0,
});

// Cleanup all resources
await browserContext.cleanup();
```

## Planner Agent Output Schema

The Planner agent analyzes task progress and provides strategic guidance with structured output.

```typescript
import { z } from 'zod';

// Planner output schema
const plannerOutputSchema = z.object({
  observation: z.string(),    // Current state analysis
  challenges: z.string(),     // Identified obstacles
  done: z.boolean(),          // Whether task is complete
  next_steps: z.string(),     // Recommended actions
  final_answer: z.string(),   // Final result when done
  reasoning: z.string(),      // Explanation of decisions
  web_task: z.boolean(),      // Whether this requires web interaction
});

// Example planner output
const plannerOutput = {
  observation: "Currently on GitHub trending page. Found 10 Python repositories visible.",
  challenges: "Need to scroll down to see more repositories.",
  done: false,
  next_steps: "Scroll down to load more trending repositories, then extract repository names and star counts.",
  final_answer: "",
  reasoning: "The page shows trending repos but we need more data to complete the task.",
  web_task: true,
};

// When task completes
const completedOutput = {
  observation: "Extracted top 10 trending Python repositories with star counts.",
  challenges: "None",
  done: true,
  next_steps: "",
  final_answer: "Top trending Python repos: 1. repo-a (15.2k stars), 2. repo-b (12.8k stars)...",
  reasoning: "Successfully gathered all requested information from GitHub trending page.",
  web_task: false,
};
```

## Event System

The event system provides real-time updates on agent execution state.

```typescript
import { EventManager } from './event/manager';
import { Actors, ExecutionState, AgentEvent } from './event/types';

// Event actors
const actors = {
  SYSTEM: 'system',
  NAVIGATOR: 'navigator',
  PLANNER: 'planner',
};

// Execution states
const states = {
  TASK_START: 'task_start',
  TASK_OK: 'task_ok',
  TASK_FAIL: 'task_fail',
  TASK_CANCEL: 'task_cancel',
  TASK_PAUSE: 'task_pause',
  STEP_START: 'step_start',
  STEP_OK: 'step_ok',
  STEP_FAIL: 'step_fail',
  STEP_CANCEL: 'step_cancel',
  ACT_START: 'act_start',
  ACT_OK: 'act_ok',
  ACT_FAIL: 'act_fail',
};

// Subscribe to events
executor.subscribeExecutionEvents(async (event: AgentEvent) => {
  // Event structure
  const { actor, state, payload } = event;
  const { taskId, step, maxSteps, details } = payload;

  console.log(`[Step ${step}/${maxSteps}] ${actor}: ${state} - ${details}`);

  // Handle specific states
  if (state === ExecutionState.TASK_OK) {
    console.log('Task completed successfully!');
  } else if (state === ExecutionState.TASK_FAIL) {
    console.error('Task failed:', details);
  } else if (state === ExecutionState.ACT_START) {
    console.log('Starting action:', details);
  }
});

// Emit custom events from agent context
context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, 'Clicked submit button');
```

## Storage API

Chrome extension storage for LLM providers, agent models, and settings.

```typescript
import {
  llmProviderStore,
  agentModelStore,
  generalSettingsStore,
  firewallStore,
  AgentNameEnum,
} from '@extension/storage';

// LLM Provider configuration
await llmProviderStore.setProvider('anthropic', {
  name: 'Anthropic',
  apiKey: 'sk-ant-...',
  baseUrl: 'https://api.anthropic.com',
});

const providers = await llmProviderStore.getAllProviders();
// { anthropic: { name: 'Anthropic', apiKey: '...', baseUrl: '...' }, ... }

// Agent model assignment
await agentModelStore.setAgentModel(AgentNameEnum.Navigator, {
  provider: 'anthropic',
  modelName: 'claude-3-haiku-20240307',
});

await agentModelStore.setAgentModel(AgentNameEnum.Planner, {
  provider: 'anthropic',
  modelName: 'claude-sonnet-4-20250514',
});

const agentModels = await agentModelStore.getAllAgentModels();

// General settings
await generalSettingsStore.setSettings({
  maxSteps: 100,
  maxFailures: 3,
  maxActionsPerStep: 10,
  useVision: true,
  displayHighlights: true,
  minWaitPageLoad: 500,
  planningInterval: 3,
  replayHistoricalTasks: true,
});

const settings = await generalSettingsStore.getSettings();

// Firewall settings (URL allow/deny lists)
await firewallStore.setFirewall({
  enabled: true,
  allowList: ['*.github.com', '*.stackoverflow.com'],
  denyList: ['*.ads.com'],
});

const firewall = await firewallStore.getFirewall();
```

## Internationalization (i18n)

Use the i18n system for localized messages throughout the extension.

```typescript
import { t } from '@extension/i18n';

// Simple messages
const errorMsg = t('bg_errors_noTabId');
const successMsg = t('act_goToUrl_ok', ['https://example.com']);

// Key naming convention: component_category_specificAction_state
// Prefixes:
// - bg_    : Background service worker
// - exec_  : Executor/agent execution
// - act_   : Agent actions
// - errors_: Global errors
// - options_: Settings page
// - chat_  : Chat interface

// State suffixes:
// - _start : Action beginning
// - _ok    : Success
// - _fail  : Failure
// - _cancel: Cancelled

// Example usage in actions
t('act_click_start', [elementIndex.toString()]);      // "Clicking element 5"
t('act_click_ok', [index, elementText]);              // "Clicked 5: Submit Button"
t('act_errors_elementNotExist', [index.toString()]);  // "Element 5 does not exist"

// Locale JSON format (packages/i18n/locales/en/messages.json)
/*
{
  "act_goToUrl_start": {
    "message": "Navigating to $URL$",
    "placeholders": {
      "url": { "content": "$1", "example": "https://example.com" }
    }
  }
}
*/
```

## Summary

Nanobrowser provides a powerful platform for building AI-driven web automation workflows. The multi-agent architecture allows for sophisticated task planning and execution, with the Planner agent handling high-level strategy while the Navigator agent manages precise DOM interactions. The extension's event system enables real-time monitoring and control of automation tasks, while the flexible LLM provider system supports various AI models from commercial APIs to local deployments via Ollama.

Integration patterns typically involve: (1) configuring LLM providers and agent model assignments through the storage API, (2) creating an Executor instance with the appropriate browser context and options, (3) subscribing to execution events for monitoring and UI updates, (4) executing tasks via natural language commands, and (5) handling follow-up tasks and task control (pause/resume/cancel) through the same Executor instance. The Chrome extension message API provides the communication layer between the side panel UI and background service worker, enabling a responsive user experience for web automation tasks.
