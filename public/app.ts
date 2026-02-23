interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  position: number;
}

type TaskPatch = Partial<Pick<Task, 'title' | 'done'>>;

const taskList   = document.getElementById('task-list') as HTMLUListElement;
const addForm    = document.getElementById('add-form') as HTMLFormElement;
const taskInput  = document.getElementById('task-input') as HTMLInputElement;
const taskCount  = document.getElementById('task-count') as HTMLSpanElement;
const taskFooter = document.getElementById('task-footer') as HTMLElement;
const clearDone  = document.getElementById('clear-done') as HTMLButtonElement;

let currentFilter: 'all' | 'active' | 'done' = 'all';
let allTasks: Task[] = [];
let draggedId: string | null = null;

// Single shared element used as the drag insertion indicator.
const dropIndicator = document.createElement('li');
dropIndicator.className = 'drop-indicator';

// The indicator itself must accept drops: without a dragover that calls
// preventDefault() on it, the browser treats the gap as a non-drop-target
// and never fires drop — causing the move to silently fail when the user
// releases the mouse directly over the insertion line.
dropIndicator.addEventListener('dragover', (e: DragEvent) => {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
});
dropIndicator.addEventListener('drop', (e: DragEvent) => {
  e.preventDefault();
  dropIndicator.remove();
  if (!draggedId) return;
  // Determine insertion point from the indicator's current DOM position.
  const next = dropIndicator.nextElementSibling as HTMLElement | null;
  const prev = dropIndicator.previousElementSibling as HTMLElement | null;
  const nextId = next?.dataset.id;
  const prevId = prev?.dataset.id;
  if (nextId && nextId !== draggedId) {
    moveTask(draggedId, nextId, 'before');
  } else if (prevId && prevId !== draggedId) {
    moveTask(draggedId, prevId, 'after');
  }
});

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(url: string, options: RequestInit = {}): Promise<Task[] | Task | null> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<Task[] | Task>;
}

const api = {
  list:    (): Promise<Task[]>                         => apiFetch('/api/tasks') as Promise<Task[]>,
  create:  (title: string): Promise<Task>              => apiFetch('/api/tasks', { method: 'POST',   body: JSON.stringify({ title }) }) as Promise<Task>,
  update:  (id: string, patch: TaskPatch): Promise<Task> => apiFetch(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(patch) }) as Promise<Task>,
  remove:  (id: string): Promise<null>                 => apiFetch(`/api/tasks/${id}`, { method: 'DELETE' }) as Promise<null>,
  reorder: (ids: string[]): Promise<Task[]>            => apiFetch('/api/tasks/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }) as Promise<Task[]>,
};

// ── Render ────────────────────────────────────────────────────────────────────

function filterTasks(tasks: Task[]): Task[] {
  if (currentFilter === 'active') return tasks.filter(t => !t.done);
  if (currentFilter === 'done')   return tasks.filter(t =>  t.done);
  return tasks;
}

function render(tasks: Task[]): void {
  taskList.innerHTML = '';

  const visible = filterTasks(tasks);

  if (visible.length === 0) {
    taskList.innerHTML = '<li class="empty">No tasks here 🎉</li>';
  } else {
    visible.forEach(task => taskList.appendChild(buildItem(task)));
  }

  const active = tasks.filter(t => !t.done).length;
  taskCount.textContent = `${active} task${active !== 1 ? 's' : ''} left`;
  taskFooter.classList.toggle('hidden', tasks.length === 0);
}

function buildItem(task: Task): HTMLLIElement {
  const li = document.createElement('li');
  li.className = `task-item${task.done ? ' done' : ''}`;
  li.dataset.id = task.id;
  li.draggable = true;

  // Drag handle
  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.textContent = '⠿';
  handle.setAttribute('aria-hidden', 'true');

  // Drag-and-drop events
  li.addEventListener('dragstart', (e: DragEvent) => {
    draggedId = task.id;
    li.classList.add('dragging');
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  });
  li.addEventListener('dragend', () => {
    dropIndicator.remove();
    li.classList.remove('dragging');
    draggedId = null;
  });
  li.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const rect = li.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      taskList.insertBefore(dropIndicator, li);
    } else {
      taskList.insertBefore(dropIndicator, li.nextElementSibling);
    }
  });
  li.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault();
    dropIndicator.remove();
    if (draggedId && draggedId !== task.id) {
      const rect = li.getBoundingClientRect();
      const side = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      moveTask(draggedId, task.id, side);
    }
  });

  // Checkbox
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = task.done;
  cb.addEventListener('change', () => toggleDone(task.id, cb.checked));

  // Title (double-click to edit)
  const span = document.createElement('span');
  span.className = 'task-title';
  span.textContent = task.title;
  span.addEventListener('dblclick', () => startEdit(task, li, span));

  // Delete button
  const del = document.createElement('button');
  del.className = 'btn-delete';
  del.textContent = '✕';
  del.setAttribute('aria-label', 'Delete task');
  del.addEventListener('click', () => deleteTask(task.id));

  li.append(handle, cb, span, del);
  return li;
}

// ── Inline editing ────────────────────────────────────────────────────────────

function startEdit(task: Task, li: HTMLLIElement, span: HTMLSpanElement): void {
  const input = document.createElement('input');
  input.className = 'edit-input';
  input.value = task.title;
  li.replaceChild(input, span);
  input.focus();

  function commit(): void {
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== task.title) {
      api.update(task.id, { title: newTitle }).then(loadTasks).catch(console.error);
    } else {
      li.replaceChild(span, input);
    }
  }

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter')  { input.blur(); }
    if (e.key === 'Escape') { li.replaceChild(span, input); }
  });
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function loadTasks(): Promise<void> {
  allTasks = await api.list();
  render(allTasks);
}

async function addTask(title: string): Promise<void> {
  await api.create(title);
  await loadTasks();
}

function moveTask(fromId: string, toId: string, side: 'before' | 'after'): void {
  const ids = allTasks.map(t => t.id);
  const fromIdx = ids.indexOf(fromId);
  const toIdx   = ids.indexOf(toId);
  if (fromIdx === -1 || toIdx === -1) return;
  ids.splice(fromIdx, 1);
  const newToIdx = ids.indexOf(toId); // recalculate after removal
  ids.splice(side === 'before' ? newToIdx : newToIdx + 1, 0, fromId);
  api.reorder(ids).then(tasks => { allTasks = tasks; render(allTasks); }).catch(console.error);
}

async function toggleDone(id: string, done: boolean): Promise<void> {
  await api.update(id, { done });
  await loadTasks();
}

async function deleteTask(id: string): Promise<void> {
  await api.remove(id);
  await loadTasks();
}

async function clearCompleted(): Promise<void> {
  const tasks = await api.list();
  await Promise.all(tasks.filter(t => t.done).map(t => api.remove(t.id)));
  await loadTasks();
}

// ── Event listeners ───────────────────────────────────────────────────────────

// Hide the drop indicator when the cursor leaves the task list entirely.
taskList.addEventListener('dragleave', (e: DragEvent) => {
  if (!e.relatedTarget || !taskList.contains(e.relatedTarget as Node)) dropIndicator.remove();
});

addForm.addEventListener('submit', (e: Event) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (title) {
    taskInput.value = '';
    addTask(title);
  }
});

clearDone.addEventListener('click', clearCompleted);

document.querySelectorAll('.filter-btn').forEach((btn: Element) => {
  btn.addEventListener('click', () => {
    currentFilter = (btn as HTMLButtonElement).dataset.filter as 'all' | 'active' | 'done';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadTasks();
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────

loadTasks();
