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
// The indicator itself must accept drops: without a dragover that calls
// preventDefault() on it, the browser treats the gap as a non-drop-target
// and never fires drop — causing the move to silently fail when the user
// releases the mouse directly over the insertion line.
dropIndicator.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer)
        e.dataTransfer.dropEffect = 'move';
});
dropIndicator.addEventListener('drop', (e) => {
    e.preventDefault();
    // Read siblings BEFORE removing from the DOM — once detached, both return null.
    const next = dropIndicator.nextElementSibling;
    const prev = dropIndicator.previousElementSibling;
    dropIndicator.remove();
    console.log('[DnD] drop on indicator — draggedId:', draggedId, '| next:', next?.dataset.id ?? 'none', '| prev:', prev?.dataset.id ?? 'none');
    if (!draggedId)
        return;
    const nextId = next?.dataset.id;
    const prevId = prev?.dataset.id;
    if (nextId && nextId !== draggedId) {
        console.log('[DnD] → moveTask', draggedId, 'before', nextId);
        moveTask(draggedId, nextId, 'before');
    }
    else if (prevId && prevId !== draggedId) {
        console.log('[DnD] → moveTask', draggedId, 'after', prevId);
        moveTask(draggedId, prevId, 'after');
    }
    else {
        console.log('[DnD] → no move (same item or no valid neighbour)');
    }
});
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
        console.log('[DnD] dragstart — task:', task.title, '| id:', task.id);
    });
    li.addEventListener('dragend', () => {
        dropIndicator.remove();
        li.classList.remove('dragging');
        console.log('[DnD] dragend — draggedId cleared');
        draggedId = null;
    });
    li.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer)
            e.dataTransfer.dropEffect = 'move';
        const rect = li.getBoundingClientRect();
        const half = rect.top + rect.height / 2;
        if (e.clientY < half) {
            if (dropIndicator.nextElementSibling !== li) {
                taskList.insertBefore(dropIndicator, li);
                console.log('[DnD] indicator → before', task.title);
            }
        }
        else {
            if (dropIndicator.previousElementSibling !== li) {
                taskList.insertBefore(dropIndicator, li.nextElementSibling);
                console.log('[DnD] indicator → after', task.title);
            }
        }
    });
    li.addEventListener('drop', (e) => {
        e.preventDefault();
        dropIndicator.remove();
        const rect = li.getBoundingClientRect();
        const side = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        console.log('[DnD] drop on task:', task.title, '| side:', side, '| draggedId:', draggedId);
        if (draggedId && draggedId !== task.id) {
            console.log('[DnD] → moveTask', draggedId, side, task.id);
            moveTask(draggedId, task.id, side);
        }
        else {
            console.log('[DnD] → no move (same item or no active drag)');
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
    console.log('[DnD] moveTask — from:', fromId, '(idx', fromIdx, ') |', side, toId, '(idx', toIdx, ') | order before:', ids.join(','));
    if (fromIdx === -1 || toIdx === -1) {
        console.log('[DnD] moveTask aborted — id not found in allTasks');
        return;
    }
    ids.splice(fromIdx, 1);
    const newToIdx = ids.indexOf(toId); // recalculate after removal
    ids.splice(side === 'before' ? newToIdx : newToIdx + 1, 0, fromId);
    console.log('[DnD] moveTask — order after:', ids.join(','));
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
// Make the list container itself a valid drop target so that drops landing
// in the flex gap between items (which belongs to the <ul>, not any <li>)
// are not silently discarded by the browser.
taskList.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer)
        e.dataTransfer.dropEffect = 'move';
});
taskList.addEventListener('drop', (e) => {
    // Only handle drops that landed directly on the <ul> (i.e. in the gap).
    // Drops on <li> items bubble here too but are already handled by their
    // own listeners; let those through without double-processing.
    if (e.target !== taskList)
        return;
    e.preventDefault();
    const next = dropIndicator.nextElementSibling;
    const prev = dropIndicator.previousElementSibling;
    dropIndicator.remove();
    console.log('[DnD] drop on list gap — draggedId:', draggedId, '| next:', next?.dataset.id ?? 'none', '| prev:', prev?.dataset.id ?? 'none');
    if (!draggedId)
        return;
    const nextId = next?.dataset.id;
    const prevId = prev?.dataset.id;
    if (nextId && nextId !== draggedId) {
        console.log('[DnD] → moveTask', draggedId, 'before', nextId);
        moveTask(draggedId, nextId, 'before');
    }
    else if (prevId && prevId !== draggedId) {
        console.log('[DnD] → moveTask', draggedId, 'after', prevId);
        moveTask(draggedId, prevId, 'after');
    }
    else {
        console.log('[DnD] → no move (no valid neighbour)');
    }
});
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
