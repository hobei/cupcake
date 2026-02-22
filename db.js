'use strict';

// Data-access layer — tasks are persisted in a SQLite database.
// DB_PATH controls the database file path (defaults to ./tasks.db).
// Use DB_PATH=:memory: for an in-process SQLite database (useful in tests).

const Database = require('better-sqlite3');
const sql = new Database(process.env.DB_PATH || './tasks.db');

sql.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id        TEXT PRIMARY KEY,
    title     TEXT NOT NULL,
    done      INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  )
`);

const toTask = row => ({ ...row, done: row.done === 1 });

module.exports = {
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
    const task = module.exports.get(id);
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

  close: () => sql.close(),
};
