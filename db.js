'use strict';

// Data-access layer — tasks are persisted in a SQLite database.
// DB_PATH controls the database file path (defaults to ./tasks.db).
// Use DB_PATH=:memory: for an in-process SQLite database (useful in tests).
//
// Note: the database connection is opened at module load time using the value
// of DB_PATH at that moment. To use a different path (e.g. :memory: in tests),
// set DB_PATH before requiring this module. jest.resetModules() combined with
// re-requiring the module is the supported pattern for test isolation.

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

sql.pragma('journal_mode = WAL');

const toTask = row => ({ ...row, done: row.done === 1 });

// Prepared statements are created once at initialisation and reused on every
// call, which is the recommended pattern for better-sqlite3.
const stmts = {
  list:   sql.prepare('SELECT * FROM tasks ORDER BY createdAt ASC'),
  get:    sql.prepare('SELECT * FROM tasks WHERE id = ?'),
  insert: sql.prepare('INSERT INTO tasks (id, title, done, createdAt) VALUES (?, ?, ?, ?)'),
  update: sql.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?'),
  delete: sql.prepare('DELETE FROM tasks WHERE id = ?'),
};

module.exports = {
  list: () => {
    try {
      return stmts.list.all().map(toTask);
    } catch (err) {
      throw new Error(`db.list failed: ${err.message}`);
    }
  },

  get: id => {
    try {
      const row = stmts.get.get(id);
      return row ? toTask(row) : undefined;
    } catch (err) {
      throw new Error(`db.get failed: ${err.message}`);
    }
  },

  add: task => {
    try {
      stmts.insert.run(task.id, task.title, task.done ? 1 : 0, task.createdAt);
      return task;
    } catch (err) {
      throw new Error(`db.add failed: ${err.message}`);
    }
  },

  update: (id, changes) => {
    try {
      const task = module.exports.get(id);
      if (!task) return null;
      const updated = { ...task, ...changes };
      stmts.update.run(updated.title, updated.done ? 1 : 0, id);
      return updated;
    } catch (err) {
      throw new Error(`db.update failed: ${err.message}`);
    }
  },

  remove: id => {
    try {
      const result = stmts.delete.run(id);
      return result.changes > 0;
    } catch (err) {
      throw new Error(`db.remove failed: ${err.message}`);
    }
  },

  close: () => sql.close(),
};
