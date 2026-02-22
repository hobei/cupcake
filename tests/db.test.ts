// Direct unit tests for the db.ts data-access layer.
// Uses DB_PATH=:memory: so each test gets a fresh in-process SQLite database.

import type { Task } from '../db';

let db: typeof import('../db');

beforeEach(() => {
  jest.resetModules();
  process.env.DB_PATH = ':memory:';
  db = require('../db');
});

afterEach(() => {
  db.close();
  delete process.env.DB_PATH;
});

describe('list', () => {
  test('returns an empty array when no tasks exist', () => {
    expect(db.list()).toEqual([]);
  });

  test('returns tasks ordered by createdAt ascending', () => {
    db.add({ id: '1', title: 'First',  done: false, createdAt: '2024-01-01T00:00:00.000Z' });
    db.add({ id: '2', title: 'Second', done: false, createdAt: '2024-01-02T00:00:00.000Z' });
    const tasks = db.list();
    expect(tasks[0].id).toBe('1');
    expect(tasks[1].id).toBe('2');
  });
});

describe('get', () => {
  test('returns the task with the given id', () => {
    db.add({ id: 'abc', title: 'Test', done: false, createdAt: '2024-01-01T00:00:00.000Z' });
    const task = db.get('abc') as Task;
    expect(task).toMatchObject({ id: 'abc', title: 'Test', done: false });
  });

  test('returns undefined for an unknown id', () => {
    expect(db.get('does-not-exist')).toBeUndefined();
  });
});

describe('add', () => {
  test('persists a task and returns it', () => {
    const task: Task = { id: 'x1', title: 'Buy milk', done: false, createdAt: '2024-01-01T00:00:00.000Z' };
    const result = db.add(task);
    expect(result).toMatchObject(task);
    expect(db.list()).toHaveLength(1);
  });

  test('stores done as a boolean', () => {
    db.add({ id: 'x2', title: 'Done task', done: true, createdAt: '2024-01-01T00:00:00.000Z' });
    expect((db.get('x2') as Task).done).toBe(true);
  });
});

describe('update', () => {
  test('updates the title of a task', () => {
    db.add({ id: 'u1', title: 'Old', done: false, createdAt: '2024-01-01T00:00:00.000Z' });
    const updated = db.update('u1', { title: 'New' }) as Task;
    expect(updated.title).toBe('New');
    expect((db.get('u1') as Task).title).toBe('New');
  });

  test('updates the done flag', () => {
    db.add({ id: 'u2', title: 'Task', done: false, createdAt: '2024-01-01T00:00:00.000Z' });
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
    db.add({ id: 'r1', title: 'Delete me', done: false, createdAt: '2024-01-01T00:00:00.000Z' });
    expect(db.remove('r1')).toBe(true);
    expect(db.list()).toHaveLength(0);
  });

  test('returns false for an unknown id', () => {
    expect(db.remove('no-such-id')).toBe(false);
  });
});
