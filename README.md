# 🧁 Cupcake

A simple, single-page task management app built with **Node.js**, **Express**, and plain **HTML/CSS/JavaScript** — no build step required.

## Features

- Add, rename, and delete tasks
- Mark tasks as done / active
- Filter by All / Active / Done
- Clear all completed tasks at once

## Quick Start

```bash
bash utils/configure.sh   # install dependencies (first time)
bash utils/run_local.sh   # start dev server at http://localhost:3000
```

Open <http://localhost:3000> in your browser.

## Scripts

| Script | Description |
|--------|-------------|
| `bash utils/configure.sh` | Install npm dependencies |
| `bash utils/build.sh`     | Type-check, compile, and audit dependencies |
| `bash utils/run_local.sh` | Run the app locally in watch mode |
| `bash utils/test.sh`      | Run the full test suite |
| `bash utils/clean.sh`     | Remove generated artefacts (`node_modules`) |

## Running Tests

```bash
bash utils/test.sh
```

Tests cover the backend REST API (via [supertest](https://github.com/ladjs/supertest)) and the frontend DOM behaviour (via [jest-environment-jsdom](https://jestjs.io/docs/configuration#testenvironment-string)).

See [docs/API.md](docs/API.md) for the REST API reference.

