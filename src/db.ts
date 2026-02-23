// Data-access layer — tasks are persisted in a SQLite database.
// DB_PATH controls the database file path (defaults to ./database/tasks.db).
// Use DB_PATH=:memory: for an in-process SQLite database (useful in tests).
//
// Note: the database connection is opened at module load time using the value
// of DB_PATH at that moment. To use a different path (e.g. :memory: in tests),
// set DB_PATH before requiring this module. jest.resetModules() combined with
// re-requiring the module is the supported pattern for test isolation.

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  position: number;
}

type TaskRow = Omit<Task, 'done'> & { done: number };
type TaskChanges = Partial<Pick<Task, 'title' | 'done'>>;

const DB_PATH = process.env.DB_PATH || './database/tasks.db';
if (DB_PATH !== ':memory:') {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
const sql = new Database(DB_PATH);

sql.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id        TEXT PRIMARY KEY,
    title     TEXT NOT NULL,
    done      INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    position  INTEGER NOT NULL DEFAULT 0
  )
`);

sql.pragma('journal_mode = WAL');

const toTask = (row: TaskRow): Task => ({ ...row, done: row.done === 1 });

// Prepared statements are created once at initialisation and reused on every
// call, which is the recommended pattern for better-sqlite3.
const stmts = {
  list:      sql.prepare('SELECT * FROM tasks ORDER BY position ASC'),
  get:       sql.prepare('SELECT * FROM tasks WHERE id = ?'),
  insert:    sql.prepare('INSERT INTO tasks (id, title, done, createdAt, position) VALUES (?, ?, ?, ?, ?)'),
  update:    sql.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?'),
  updatePos: sql.prepare('UPDATE tasks SET position = ? WHERE id = ?'),
  maxPos:    sql.prepare('SELECT COALESCE(MAX(position), 0) AS maxPos FROM tasks'),
  delete:    sql.prepare('DELETE FROM tasks WHERE id = ?'),
};

export function list(): Task[] {
  try {
    return (stmts.list.all() as TaskRow[]).map(toTask);
  } catch (err) {
    throw new Error(`db.list failed: ${(err as Error).message}`);
  }
}

export function get(id: string): Task | undefined {
  try {
    const row = stmts.get.get(id) as TaskRow | undefined;
    return row ? toTask(row) : undefined;
  } catch (err) {
    throw new Error(`db.get failed: ${(err as Error).message}`);
  }
}

export function add(task: Task): Task {
  try {
    stmts.insert.run(task.id, task.title, task.done ? 1 : 0, task.createdAt, task.position);
    return task;
  } catch (err) {
    throw new Error(`db.add failed: ${(err as Error).message}`);
  }
}

export function update(id: string, changes: TaskChanges): Task | null {
  try {
    const task = get(id);
    if (!task) return null;
    const updated: Task = { ...task, ...changes };
    stmts.update.run(updated.title, updated.done ? 1 : 0, id);
    return updated;
  } catch (err) {
    throw new Error(`db.update failed: ${(err as Error).message}`);
  }
}

export function remove(id: string): boolean {
  try {
    const result = stmts.delete.run(id);
    return result.changes > 0;
  } catch (err) {
    throw new Error(`db.remove failed: ${(err as Error).message}`);
  }
}

export function nextPosition(): number {
  try {
    return (stmts.maxPos.get() as { maxPos: number }).maxPos + 1;
  } catch (err) {
    throw new Error(`db.nextPosition failed: ${(err as Error).message}`);
  }
}

export function reorder(ids: string[]): void {
  const reorderTx = sql.transaction(() => {
    ids.forEach((id, idx) => {
      stmts.updatePos.run(idx + 1, id);
    });
  });
  try {
    reorderTx();
  } catch (err) {
    throw new Error(`db.reorder failed: ${(err as Error).message}`);
  }
}

export function close(): void {
  sql.close();
}
