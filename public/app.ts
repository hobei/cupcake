interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

type TaskPatch = Partial<Pick<Task, 'title' | 'done'>>;

const taskList   = document.getElementById('task-list') as HTMLUListElement;
const addForm    = document.getElementById('add-form') as HTMLFormElement;
const taskInput  = document.getElementById('task-input') as HTMLInputElement;
const taskCount  = document.getElementById('task-count') as HTMLSpanElement;
const taskFooter = document.getElementById('task-footer') as HTMLElement;
const clearDone  = document.getElementById('clear-done') as HTMLButtonElement;

let currentFilter: 'all' | 'active' | 'done' = 'all';

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
  list:   (): Promise<Task[]>                   => apiFetch('/api/tasks') as Promise<Task[]>,
  create: (title: string): Promise<Task>        => apiFetch('/api/tasks', { method: 'POST',   body: JSON.stringify({ title }) }) as Promise<Task>,
  update: (id: string, patch: TaskPatch): Promise<Task> => apiFetch(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(patch) }) as Promise<Task>,
  remove: (id: string): Promise<null>           => apiFetch(`/api/tasks/${id}`, { method: 'DELETE' }) as Promise<null>,
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

  li.append(cb, span, del);
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
  const tasks = await api.list();
  render(tasks);
}

async function addTask(title: string): Promise<void> {
  await api.create(title);
  await loadTasks();
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
