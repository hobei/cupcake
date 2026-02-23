"use strict";
const taskList = document.getElementById('task-list');
const addForm = document.getElementById('add-form');
const taskInput = document.getElementById('task-input');
const taskCount = document.getElementById('task-count');
const taskFooter = document.getElementById('task-footer');
const clearDone = document.getElementById('clear-done');
let currentFilter = 'all';
let allTasks = [];
let draggedId = null;
// Single shared element used as the drag insertion indicator.
const dropIndicator = document.createElement('li');
dropIndicator.className = 'drop-indicator';
// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (res.status === 204)
        return null;
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
    }
    return res.json();
}
const api = {
    list: () => apiFetch('/api/tasks'),
    create: (title) => apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ title }) }),
    update: (id, patch) => apiFetch(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
    remove: (id) => apiFetch(`/api/tasks/${id}`, { method: 'DELETE' }),
    reorder: (ids) => apiFetch('/api/tasks/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }),
};
// ── Render ────────────────────────────────────────────────────────────────────
function filterTasks(tasks) {
    if (currentFilter === 'active')
        return tasks.filter(t => !t.done);
    if (currentFilter === 'done')
        return tasks.filter(t => t.done);
    return tasks;
}
function render(tasks) {
    taskList.innerHTML = '';
    const visible = filterTasks(tasks);
    if (visible.length === 0) {
        taskList.innerHTML = '<li class="empty">No tasks here 🎉</li>';
    }
    else {
        visible.forEach(task => taskList.appendChild(buildItem(task)));
    }
    const active = tasks.filter(t => !t.done).length;
    taskCount.textContent = `${active} task${active !== 1 ? 's' : ''} left`;
    taskFooter.classList.toggle('hidden', tasks.length === 0);
}
function buildItem(task) {
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
    li.addEventListener('dragstart', (e) => {
        draggedId = task.id;
        li.classList.add('dragging');
        if (e.dataTransfer)
            e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => {
        dropIndicator.remove();
        li.classList.remove('dragging');
        draggedId = null;
    });
    li.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer)
            e.dataTransfer.dropEffect = 'move';
        const rect = li.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
            taskList.insertBefore(dropIndicator, li);
        }
        else {
            taskList.insertBefore(dropIndicator, li.nextElementSibling);
        }
    });
    li.addEventListener('drop', (e) => {
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
function startEdit(task, li, span) {
    const input = document.createElement('input');
    input.className = 'edit-input';
    input.value = task.title;
    li.replaceChild(input, span);
    input.focus();
    function commit() {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== task.title) {
            api.update(task.id, { title: newTitle }).then(loadTasks).catch(console.error);
        }
        else {
            li.replaceChild(span, input);
        }
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
        if (e.key === 'Escape') {
            li.replaceChild(span, input);
        }
    });
}
// ── Actions ───────────────────────────────────────────────────────────────────
async function loadTasks() {
    allTasks = await api.list();
    render(allTasks);
}
async function addTask(title) {
    await api.create(title);
    await loadTasks();
}
function moveTask(fromId, toId, side) {
    const ids = allTasks.map(t => t.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1)
        return;
    ids.splice(fromIdx, 1);
    const newToIdx = ids.indexOf(toId); // recalculate after removal
    ids.splice(side === 'before' ? newToIdx : newToIdx + 1, 0, fromId);
    api.reorder(ids).then(tasks => { allTasks = tasks; render(allTasks); }).catch(console.error);
}
async function toggleDone(id, done) {
    await api.update(id, { done });
    await loadTasks();
}
async function deleteTask(id) {
    await api.remove(id);
    await loadTasks();
}
async function clearCompleted() {
    const tasks = await api.list();
    await Promise.all(tasks.filter(t => t.done).map(t => api.remove(t.id)));
    await loadTasks();
}
// ── Event listeners ───────────────────────────────────────────────────────────
// Hide the drop indicator when the cursor leaves the task list entirely.
taskList.addEventListener('dragleave', (e) => {
    if (!e.relatedTarget || !taskList.contains(e.relatedTarget))
        dropIndicator.remove();
});
addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (title) {
        taskInput.value = '';
        addTask(title);
    }
});
clearDone.addEventListener('click', clearCompleted);
document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadTasks();
    });
});
// ── Init ──────────────────────────────────────────────────────────────────────
loadTasks();
