# GitHub Copilot Instructions

This is **Cupcake** — a lightweight, single-page task management app built with Node.js, Express, and plain HTML/CSS/JavaScript. There is no build step; the browser code runs directly from `public/`.

## Project Layout

```
cupcake/
├── server.js          # Express server + REST API (port 3000 by default)
├── package.json       # npm scripts and dependencies
├── public/
│   ├── index.html     # Single-page UI
│   ├── style.css      # Styles
│   └── app.js         # Browser-side fetch logic
├── tests/
│   ├── server.test.js # Backend API tests (Jest + supertest)
│   └── app.test.js    # Frontend DOM tests (Jest + jsdom)
├── configure.sh       # One-time setup (npm install)
├── build.sh           # Placeholder for future build step
├── run_local.sh       # Run the app locally (npm run dev)
├── test.sh            # Run the test suite (npm test)
├── clean.sh           # Remove generated artefacts (node_modules)
├── DESIGN.md          # Architecture and technology decisions
└── AGENTS.md          # Guidance for AI coding agents
```

## Development Workflow

| Task | Command |
|------|---------|
| First-time setup | `bash configure.sh` |
| Start dev server  | `bash run_local.sh` |
| Run tests         | `bash test.sh` |
| Clean artefacts   | `bash clean.sh` |

## Code Conventions

- `'use strict'` at the top of every JavaScript file.
- Use `crypto.randomUUID()` for generating unique IDs (never `Math.random()`).
- Respect the `PORT` environment variable with `process.env.PORT || 3000`.
- Use `textContent` (not `innerHTML`) when inserting user-supplied text to prevent XSS.
- The server exports `app` via `module.exports = app` and starts listening only when run directly (`require.main === module`). This makes the server testable via supertest without starting a real HTTP listener.

## Testing

Tests live in `tests/`. Run them with `bash test.sh` or `npm test`.

- **Backend tests** (`tests/server.test.js`): use Jest + supertest. Each `beforeEach` resets modules so every test gets a fresh in-memory task store.
- **Frontend tests** (`tests/app.test.js`): use Jest with the jsdom environment. They set up the DOM fixture, mock `global.fetch`, then `require('../public/app.js')` to exercise the browser code.

When adding new features:
1. Add or update the relevant test in `tests/`.
2. Make sure `npm test` passes before pushing.

## API Summary

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/tasks`      | List all tasks |
| POST   | `/api/tasks`      | Create a task (`{ title }`) |
| PUT    | `/api/tasks/:id`  | Update a task (`{ title?, done? }`) |
| DELETE | `/api/tasks/:id`  | Delete a task |

Tasks have the shape `{ id, title, done, createdAt }`.
