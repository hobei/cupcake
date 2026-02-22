'use strict';

// Data-access layer.
// When DB_PATH is set, tasks are persisted in a SQLite database at that path.
// Use DB_PATH=:memory: for an in-process SQLite database (useful in tests).
// When DB_PATH is not set, an in-memory JavaScript array is used (no persistence).

const DB_PATH = process.env.DB_PATH;

let store;

if (DB_PATH) {
  const Database = require('better-sqlite3');
  const sql = new Database(DB_PATH);

  sql.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id        TEXT PRIMARY KEY,
      title     TEXT NOT NULL,
      done      INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    )
  `);

  const toTask = row => ({ ...row, done: row.done === 1 });

  store = {
    list: () =>
      sql.prepare('SELECT * FROM tasks ORDER BY createdAt ASC').all().map(toTask),

    get: id => {
      const row = sql.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
      return row ? toTask(row) : undefined;
    },

    add: task => {
      sql
        .prepare('INSERT INTO tasks (id, title, done, createdAt) VALUES (?, ?, ?, ?)')
        .run(task.id, task.title, task.done ? 1 : 0, task.createdAt);
      return task;
    },

    update: (id, changes) => {
      const task = store.get(id);
      if (!task) return null;
      const updated = { ...task, ...changes };
      sql
        .prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?')
        .run(updated.title, updated.done ? 1 : 0, id);
      return updated;
    },

    remove: id => {
      const result = sql.prepare('DELETE FROM tasks WHERE id = ?').run(id);
      return result.changes > 0;
    },
  };
} else {
  let tasks = [];

  store = {
    list: () => [...tasks],

    get: id => tasks.find(t => t.id === id),

    add: task => {
      tasks.push(task);
      return task;
    },

    update: (id, changes) => {
      const task = tasks.find(t => t.id === id);
      if (!task) return null;
      Object.assign(task, changes);
      return task;
    },

    remove: id => {
      const index = tasks.findIndex(t => t.id === id);
      if (index === -1) return false;
      tasks.splice(index, 1);
      return true;
    },
  };
}

module.exports = store;
