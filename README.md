# 🧁 Cupcake

A simple, single-page task management app built with **Node.js**, **Express**, and plain **HTML/CSS/JavaScript** — no build step required.

## Features

- Add, rename, and delete tasks
- Mark tasks as done / active
- Filter by All / Active / Done
- Clear all completed tasks at once

## Quick Start

```bash
bash configure.sh   # install dependencies (first time)
bash run_local.sh   # start dev server at http://localhost:3000
```

Open <http://localhost:3000> in your browser.

## Scripts

| Script | Description |
|--------|-------------|
| `bash configure.sh` | Install npm dependencies |
| `bash build.sh`     | Build step (placeholder for future use) |
| `bash run_local.sh` | Run the app locally in watch mode |
| `bash test.sh`      | Run the full test suite |
| `bash clean.sh`     | Remove generated artefacts (`node_modules`) |

## Running Tests

```bash
bash test.sh
```

Tests cover the backend REST API (via [supertest](https://github.com/ladjs/supertest)) and the frontend DOM behaviour (via [jest-environment-jsdom](https://jestjs.io/docs/configuration#testenvironment-string)).

## Project Structure

```
cupcake/
├── server.js        # Express server + REST API
├── package.json     # Dependencies and npm scripts
├── public/
│   ├── index.html   # Single-page UI
│   ├── style.css    # Styles
│   └── app.js       # Browser-side logic
├── tests/
│   ├── server.test.js  # Backend API tests
│   └── app.test.js     # Frontend DOM tests
├── configure.sh     # Setup
├── build.sh         # Build (placeholder)
├── run_local.sh     # Local run
├── test.sh          # Test runner
├── clean.sh         # Cleanup
└── DESIGN.md        # Architecture decisions
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/tasks`     | List all tasks |
| POST   | `/api/tasks`     | Create a task (`{ title }`) |
| PUT    | `/api/tasks/:id` | Update a task (`{ title?, done? }`) |
| DELETE | `/api/tasks/:id` | Delete a task |

## CI

Every push to `main` and every pull request is built and tested automatically via GitHub Actions (see `.github/workflows/ci.yml`).

