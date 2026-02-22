# Design Decisions

## Technology Stack

### Runtime: Node.js

Node.js was chosen because:
- **Zero install friction on macOS** — Node.js is available via Homebrew (`brew install node`) or the official installer, and is already present on many developer machines.
- **Single language** — JavaScript is used on both the server and the browser, so there is no context-switch between languages.
- **Large ecosystem** — npm provides a vast library of packages if the project needs to grow.
- **Production-ready** — Node.js powers many high-traffic websites, so the same code that runs locally can be deployed to a live server without changes.

### Web Framework: Express

Express was chosen because:
- **Minimal and un-opinionated** — it adds only a thin layer on top of Node's built-in `http` module, making it easy to understand and extend.
- **Industry standard** — widely documented, with a large community and many deployment guides.
- **Serves static files** — `express.static` lets the same server deliver both the API and the HTML/CSS/JS frontend with no extra tooling.

### Frontend: Plain HTML + CSS + JavaScript

No front-end framework (React, Vue, etc.) was chosen for the initial scaffold because:
- **No build step required** — the site runs directly from the file system; there is nothing to compile.
- **Simpler onboarding** — anyone can open `public/index.html` and understand it immediately.
- **Easy to upgrade** — if a framework is needed later, the existing API and file layout remain unchanged; only the `public/` directory would be replaced.

### Data Storage: SQLite

Tasks are persisted in a SQLite database using `better-sqlite3`. The database file path is controlled by the `DB_PATH` environment variable (defaults to `./tasks.db`).

```bash
bash run_local.sh                          # uses ./tasks.db
DB_PATH=/path/to/myapp.db bash run_local.sh  # custom path
```

SQLite was chosen because:
- **Zero-config** — no separate database process to install or manage.
- **Persistent** — tasks survive server restarts.
- **Portable** — the entire database is a single file that can be copied or deleted easily.

For tests, `DB_PATH=:memory:` uses SQLite's built-in in-memory mode — no file is created and no I/O occurs. Because `jest.resetModules()` is called in `beforeEach`, each individual test gets a completely fresh, empty in-memory database.

## Project Structure

```
cupcake/
├── server.js        # Express server + REST API
├── package.json     # Dependencies and npm scripts
├── public/
│   ├── index.html   # Single-page UI
│   ├── style.css    # Styles
│   └── app.js       # Browser-side logic (fetch calls to the API)
├── DESIGN.md        # This file
└── .gitignore
```

## Running Locally

```bash
npm install   # install dependencies (first time only)
npm start     # start the server on http://localhost:3000
```

## Deploying to a Live Server

The app is a standard Node.js HTTP server. It can be deployed to any platform that supports Node.js, for example:

| Platform | Command |
|----------|---------|
| [Railway](https://railway.app) | Push to GitHub, connect repo |
| [Render](https://render.com) | Push to GitHub, connect repo |
| [Heroku](https://heroku.com) | `git push heroku main` |
| Any VPS | `node server.js` (behind nginx or similar) |

The `PORT` environment variable is respected (`process.env.PORT || 3000`), which is the convention expected by all major hosting providers.
