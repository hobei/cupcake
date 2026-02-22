# API Reference

## Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/tasks`     | List all tasks |
| POST   | `/api/tasks`     | Create a task (`{ title }`) |
| PUT    | `/api/tasks/:id` | Update a task (`{ title?, done? }`) |
| DELETE | `/api/tasks/:id` | Delete a task |

Tasks have the shape `{ id, title, done, createdAt }`.
