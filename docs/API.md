# API Reference

## Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/tasks`          | List all tasks (ordered by position) |
| POST   | `/api/tasks`          | Create a task (`{ title }`) |
| PUT    | `/api/tasks/reorder`  | Reorder tasks (`{ ids: string[] }`) |
| PUT    | `/api/tasks/:id`      | Update a task (`{ title?, done? }`) |
| DELETE | `/api/tasks/:id`      | Delete a task |

Tasks have the shape `{ id, title, done, createdAt, position }`.

`position` is a 1-based integer that determines display order. Use `PUT /api/tasks/reorder` to bulk-update positions by supplying all task IDs in the desired order.
