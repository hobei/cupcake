/**
 * @jest-environment jsdom
 */
'use strict';

const HTML_FIXTURE = `
  <form id="add-form">
    <input id="task-input" type="text" autocomplete="off" required />
    <button type="submit">Add</button>
  </form>
  <div class="filters">
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="active">Active</button>
    <button class="filter-btn" data-filter="done">Done</button>
  </div>
  <ul id="task-list"></ul>
  <footer id="task-footer" class="hidden">
    <span id="task-count"></span>
    <button id="clear-done">Clear completed</button>
  </footer>
`;

// Flush the microtask queue so async operations driven by mocked fetch settle.
function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function makeFetchResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  document.body.innerHTML = HTML_FIXTURE;
  jest.resetModules();
});

describe('initial load', () => {
  test('shows empty placeholder when there are no tasks', async () => {
    global.fetch = jest.fn().mockReturnValue(makeFetchResponse([]));

    require('../public/app.js');
    await flushPromises();

    const list = document.getElementById('task-list');
    expect(list.querySelector('.empty')).not.toBeNull();
  });

  test('renders tasks returned by the API', async () => {
    const tasks = [
      { id: '1', title: 'Buy milk', done: false, createdAt: '2024-01-01T00:00:00.000Z' },
      { id: '2', title: 'Walk dog', done: true,  createdAt: '2024-01-01T01:00:00.000Z' },
    ];
    global.fetch = jest.fn().mockReturnValue(makeFetchResponse(tasks));

    require('../public/app.js');
    await flushPromises();

    const items = document.querySelectorAll('.task-item');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('.task-title').textContent).toBe('Buy milk');
    expect(items[1].classList.contains('done')).toBe(true);
  });

  test('task count reflects active items', async () => {
    const tasks = [
      { id: '1', title: 'A', done: false, createdAt: '' },
      { id: '2', title: 'B', done: true,  createdAt: '' },
    ];
    global.fetch = jest.fn().mockReturnValue(makeFetchResponse(tasks));

    require('../public/app.js');
    await flushPromises();

    expect(document.getElementById('task-count').textContent).toBe('1 task left');
  });
});

describe('form submission', () => {
  test('submitting the form calls the create API', async () => {
    const fetchMock = jest.fn()
      .mockReturnValueOnce(makeFetchResponse([]))                             // initial load
      .mockReturnValueOnce(makeFetchResponse({ id: '3', title: 'New task', done: false, createdAt: '' }, 201)) // create
      .mockReturnValueOnce(makeFetchResponse([{ id: '3', title: 'New task', done: false, createdAt: '' }]));   // reload

    global.fetch = fetchMock;

    require('../public/app.js');
    await flushPromises();

    document.getElementById('task-input').value = 'New task';
    document.getElementById('add-form').dispatchEvent(new Event('submit'));
    await flushPromises();

    // The second fetch call should be a POST to /api/tasks
    const [url, opts] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/tasks');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body).title).toBe('New task');
  });
});

describe('filter buttons', () => {
  test('clicking the Active filter shows only incomplete tasks', async () => {
    const tasks = [
      { id: '1', title: 'Active task', done: false, createdAt: '' },
      { id: '2', title: 'Done task',   done: true,  createdAt: '' },
    ];
    global.fetch = jest.fn().mockReturnValue(makeFetchResponse(tasks));

    require('../public/app.js');
    await flushPromises();

    document.querySelector('[data-filter="active"]').click();
    await flushPromises();

    const items = document.querySelectorAll('.task-item');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('.task-title').textContent).toBe('Active task');
  });
});
