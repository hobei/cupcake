'use strict';

const crypto = require('crypto');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory task store. Each task: { id, title, done, createdAt }
let tasks = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API ──────────────────────────────────────────────────────────────────────

// List all tasks
app.get('/api/tasks', (_req, res) => {
  res.json(tasks);
});

// Create a task
app.post('/api/tasks', (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  const task = { id: crypto.randomUUID(), title, done: false, createdAt: new Date().toISOString() };
  tasks.push(task);
  res.status(201).json(task);
});

// Update a task (toggle done, rename)
app.put('/api/tasks/:id', (req, res) => {
  const id = req.params.id;
  const task = tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'task not found' });

  if (typeof req.body.done === 'boolean') task.done = req.body.done;
  if (typeof req.body.title === 'string') {
    const title = req.body.title.trim();
    if (!title) return res.status(400).json({ error: 'title cannot be empty' });
    task.title = title;
  }
  res.json(task);
});

// Delete a task
app.delete('/api/tasks/:id', (req, res) => {
  const id = req.params.id;
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return res.status(404).json({ error: 'task not found' });
  tasks.splice(index, 1);
  res.status(204).send();
});

// ── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Cupcake task manager running at http://localhost:${PORT}`);
});
