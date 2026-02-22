'use strict';

// Tests for the SQLite storage path in db.js.
// Uses an in-process SQLite database (:memory:) so no file I/O is required.

const request = require('supertest');

let app;

beforeEach(() => {
  jest.resetModules();
  process.env.DB_PATH = ':memory:';
  app = require('../server');
});

afterEach(() => {
  delete process.env.DB_PATH;
});

describe('SQLite: GET /api/tasks', () => {
  test('returns an empty array initially', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('SQLite: POST /api/tasks', () => {
  test('creates a task and returns it', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Buy milk' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Buy milk');
    expect(res.body.done).toBe(false);
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  test('returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/tasks').send({});
    expect(res.status).toBe(400);
  });
});

describe('SQLite: PUT /api/tasks/:id', () => {
  test('toggles the done flag', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .send({ title: 'Walk the dog' });
    const { id } = createRes.body;

    const res = await request(app)
      .put(`/api/tasks/${id}`)
      .send({ done: true });
    expect(res.status).toBe(200);
    expect(res.body.done).toBe(true);
  });

  test('renames a task', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .send({ title: 'Old title' });
    const { id } = createRes.body;

    const res = await request(app)
      .put(`/api/tasks/${id}`)
      .send({ title: 'New title' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New title');
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .put('/api/tasks/does-not-exist')
      .send({ done: true });
    expect(res.status).toBe(404);
  });
});

describe('SQLite: DELETE /api/tasks/:id', () => {
  test('deletes a task', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .send({ title: 'Delete me' });
    const { id } = createRes.body;

    const delRes = await request(app).delete(`/api/tasks/${id}`);
    expect(delRes.status).toBe(204);

    const listRes = await request(app).get('/api/tasks');
    expect(listRes.body).toEqual([]);
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).delete('/api/tasks/does-not-exist');
    expect(res.status).toBe(404);
  });
});
