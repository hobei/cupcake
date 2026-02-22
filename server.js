'use strict';

const crypto = require('crypto');
const express = require('express');
const path = require('path');

const store = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API ──────────────────────────────────────────────────────────────────────

// List all tasks
app.get('/api/tasks', (_req, res) => {
  res.json(store.list());
});

// Create a task
app.post('/api/tasks', (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  const task = { id: crypto.randomUUID(), title, done: false, createdAt: new Date().toISOString() };
  store.add(task);
  res.status(201).json(task);
});

// Update a task (toggle done, rename)
app.put('/api/tasks/:id', (req, res) => {
  const id = req.params.id;
  const task = store.get(id);
  if (!task) return res.status(404).json({ error: 'task not found' });

  const changes = {};
  if (typeof req.body.done === 'boolean') changes.done = req.body.done;
  if (typeof req.body.title === 'string') {
    const title = req.body.title.trim();
    if (!title) return res.status(400).json({ error: 'title cannot be empty' });
    changes.title = title;
  }
  res.json(store.update(id, changes));
});

// Delete a task
app.delete('/api/tasks/:id', (req, res) => {
  const id = req.params.id;
  if (!store.remove(id)) return res.status(404).json({ error: 'task not found' });
  res.status(204).send();
});

// ── Start ────────────────────────────────────────────────────────────────────

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Cupcake task manager running at http://localhost:${PORT}`);
  });
}

module.exports = app;
