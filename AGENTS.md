# Agent Instructions

This is **Cupcake** — a task management app built with Node.js, Express, and plain HTML/CSS/JavaScript.

## Quick-Start

```bash
bash configure.sh   # install dependencies (npm install)
bash run_local.sh   # start dev server at http://localhost:3000
bash test.sh        # run all tests
bash clean.sh       # remove node_modules
```

## Project Layout

```
cupcake/
├── server.js          # Express REST API
├── public/            # Browser-side code (index.html, app.js, style.css)
├── tests/             # Jest test suite
├── .github/workflows/ # CI pipeline
├── configure.sh       # Setup script
├── build.sh           # Build script (placeholder)
├── run_local.sh       # Local run script
├── test.sh            # Test runner script
├── clean.sh           # Cleanup script
├── DESIGN.md          # Architecture decisions
└── .github/copilot-instructions.md  # Detailed coding conventions
```

## Key Conventions

- `'use strict'` at the top of every JS file.
- `crypto.randomUUID()` for generating IDs.
- `process.env.PORT || 3000` for the server port.
- `textContent` (not `innerHTML`) for user-supplied text.
- `server.js` exports `app` and only calls `app.listen()` when it is the entry point (`require.main === module`).

## Running Tests

```bash
bash test.sh
# or equivalently:
npm test
```

- Backend tests (`tests/server.test.js`): Jest + supertest.
- Frontend tests (`tests/app.test.js`): Jest + jest-environment-jsdom.

See `.github/copilot-instructions.md` for full coding conventions and API reference.
