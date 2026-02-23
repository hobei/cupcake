// Direct unit tests for the db.ts data-access layer.
// Uses DB_PATH=:memory: so each test gets a fresh in-process SQLite database.

import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Task } from '../src/db';

let db: typeof import('../src/db');

beforeEach(() => {
  jest.resetModules();
  process.env.DB_PATH = ':memory:';
  db = require('../src/db');
});

afterEach(() => {
  db.close();
  delete process.env.DB_PATH;
});

describe('list', () => {
  test('returns an empty array when no tasks exist', () => {
    expect(db.list()).toEqual([]);
  });

  test('returns tasks ordered by position ascending', () => {
    db.add({ id: '1', title: 'First',  done: false, createdAt: '2024-01-01T00:00:00.000Z', position: 1 });
    db.add({ id: '2', title: 'Second', done: false, createdAt: '2024-01-02T00:00:00.000Z', position: 2 });
    const tasks = db.list();
    expect(tasks[0].id).toBe('1');
    expect(tasks[1].id).toBe('2');
  });
});

describe('get', () => {
  test('returns the task with the given id', () => {
    db.add({ id: 'abc', title: 'Test', done: false, createdAt: '2024-01-01T00:00:00.000Z', position: 1 });
    const task = db.get('abc') as Task;
    expect(task).toMatchObject({ id: 'abc', title: 'Test', done: false });
  });

  test('returns undefined for an unknown id', () => {
    expect(db.get('does-not-exist')).toBeUndefined();
  });
});

describe('add', () => {
  test('persists a task and returns it', () => {
    const task: Task = { id: 'x1', title: 'Buy milk', done: false, createdAt: '2024-01-01T00:00:00.000Z', position: 1 };
    const result = db.add(task);
    expect(result).toMatchObject(task);
    expect(db.list()).toHaveLength(1);
  });

  test('stores done as a boolean', () => {
    db.add({ id: 'x2', title: 'Done task', done: true, createdAt: '2024-01-01T00:00:00.000Z', position: 1 });
    expect((db.get('x2') as Task).done).toBe(true);
  });
});

describe('update', () => {
  test('updates the title of a task', () => {
    db.add({ id: 'u1', title: 'Old', done: false, createdAt: '2024-01-01T00:00:00.000Z', position: 1 });
    const updated = db.update('u1', { title: 'New' }) as Task;
    expect(updated.title).toBe('New');
    expect((db.get('u1') as Task).title).toBe('New');
  });

  test('updates the done flag', () => {
    db.add({ id: 'u2', title: 'Task', done: false, createdAt: '2024-01-01T00:00:00.000Z', position: 1 });
    const updated = db.update('u2', { done: true }) as Task;
    expect(updated.done).toBe(true);
    expect((db.get('u2') as Task).done).toBe(true);
  });

  test('returns null for an unknown id', () => {
    expect(db.update('no-such-id', { done: true })).toBeNull();
  });
});

describe('remove', () => {
  test('deletes a task and returns true', () => {
    db.add({ id: 'r1', title: 'Delete me', done: false, createdAt: '2024-01-01T00:00:00.000Z', position: 1 });
    expect(db.remove('r1')).toBe(true);
    expect(db.list()).toHaveLength(0);
  });

  test('returns false for an unknown id', () => {
    expect(db.remove('no-such-id')).toBe(false);
  });
});

describe('nextPosition', () => {
  test('returns 1 when no tasks exist', () => {
    expect(db.nextPosition()).toBe(1);
  });

  test('returns max position + 1', () => {
    db.add({ id: 'p1', title: 'A', done: false, createdAt: '2024-01-01T00:00:00.000Z', position: 5 });
    expect(db.nextPosition()).toBe(6);
  });
});

describe('reorder', () => {
  test('updates positions to match the provided id order', () => {
    db.add({ id: 'a', title: 'A', done: false, createdAt: '2024-01-01T00:00:00.000Z', position: 1 });
    db.add({ id: 'b', title: 'B', done: false, createdAt: '2024-01-01T00:00:00.000Z', position: 2 });
    db.add({ id: 'c', title: 'C', done: false, createdAt: '2024-01-01T00:00:00.000Z', position: 3 });
    db.reorder(['c', 'a', 'b']);
    const tasks = db.list();
    expect(tasks.map(t => t.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('schema migration', () => {
  test('adds position column and backfills rows in createdAt order', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cupcake-'));
    const tmpDb  = path.join(tmpDir, 'test.db');

    // Create an old-schema database (no position column)
    const oldSql = new Database(tmpDb);
    oldSql.exec(`
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    `);
    oldSql.prepare('INSERT INTO tasks VALUES (?,?,?,?)').run('a', 'Alpha', 0, '2024-01-01T00:00:00.000Z');
    oldSql.prepare('INSERT INTO tasks VALUES (?,?,?,?)').run('b', 'Beta',  0, '2024-01-02T00:00:00.000Z');
    oldSql.close();

    // Load db.ts against the old database — migration should run automatically
    jest.resetModules();
    process.env.DB_PATH = tmpDb;
    const migratedDb = require('../src/db') as typeof import('../src/db');

    const tasks = migratedDb.list();
    expect(tasks[0]).toMatchObject({ id: 'a', position: 1 });
    expect(tasks[1]).toMatchObject({ id: 'b', position: 2 });

    migratedDb.close();
    fs.rmSync(tmpDir, { recursive: true });

    // Restore state expected by afterEach
    jest.resetModules();
    process.env.DB_PATH = ':memory:';
    db = require('../src/db');
  });
});
