import crypto from 'crypto';
import express, { Request, Response } from 'express';
import path from 'path';

import * as store from './db';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── API ──────────────────────────────────────────────────────────────────────

// List all tasks
app.get('/api/tasks', (_req: Request, res: Response) => {
  res.json(store.list());
});

// Create a task
app.post('/api/tasks', (req: Request, res: Response) => {
  const title = ((req.body.title as string) || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  const task = { id: crypto.randomUUID(), title, done: false, createdAt: new Date().toISOString(), position: store.nextPosition() };
  store.add(task);
  res.status(201).json(task);
});

// Reorder tasks — body: { ids: string[] } in the desired order
app.put('/api/tasks/reorder', (req: Request, res: Response) => {
  const ids = req.body.ids as unknown;
  if (!Array.isArray(ids) || !(ids as unknown[]).every((id): id is string => typeof id === 'string')) {
    return res.status(400).json({ error: 'ids must be an array of strings' });
  }
  store.reorder(ids as string[]);
  res.json(store.list());
});

// Update a task (toggle done, rename)
app.put('/api/tasks/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const task = store.get(id);
  if (!task) return res.status(404).json({ error: 'task not found' });

  const changes: { done?: boolean; title?: string } = {};
  if (typeof req.body.done === 'boolean') changes.done = req.body.done as boolean;
  if (typeof req.body.title === 'string') {
    const title = (req.body.title as string).trim();
    if (!title) return res.status(400).json({ error: 'title cannot be empty' });
    changes.title = title;
  }
  res.json(store.update(id, changes));
});

// Delete a task
app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!store.remove(id)) return res.status(404).json({ error: 'task not found' });
  res.status(204).send();
});

// ── Start ────────────────────────────────────────────────────────────────────

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Cupcake task manager running at http://localhost:${PORT}`);
  });
}

export = app;
