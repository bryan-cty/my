const clock = document.querySelector('#clock');
const windows = Array.from(document.querySelectorAll('[data-window-id]'));
const taskbarItems = Array.from(document.querySelectorAll('[data-taskbar-window]'));
let topZIndex = 100;
let activeDrag = null;

function updateClock() {
  if (!clock) return;
  const now = new Date();
  clock.textContent = now.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getWindow(id) {
  return windows.find((windowElement) => windowElement.dataset.windowId === id);
}

function syncTaskbar() {
  taskbarItems.forEach((item) => {
    const windowElement = getWindow(item.dataset.taskbarWindow);
    const isOpen = windowElement?.classList.contains('is-open');
    const isActive = windowElement?.classList.contains('is-active');
    item.classList.toggle('is-running', Boolean(isOpen));
    item.classList.toggle('is-active', Boolean(isActive));
  });
}

function focusWindow(windowElement) {
  if (!windowElement) return;
  windows.forEach((item) => item.classList.remove('is-active'));
  windowElement.classList.add('is-active', 'is-open');
  windowElement.classList.remove('is-minimized');
  topZIndex += 1;
  windowElement.style.zIndex = String(topZIndex);
  syncTaskbar();
}

function openWindow(id, shouldFocus = true) {
  const windowElement = getWindow(id);
  if (!windowElement) return;
  windowElement.classList.add('is-open');
  windowElement.classList.remove('is-minimized');
  if (shouldFocus) focusWindow(windowElement);
}

function closeWindow(windowElement) {
  if (!windowElement) return;
  windowElement.classList.remove('is-open', 'is-active', 'is-minimized', 'is-maximized');
  syncTaskbar();
}

function minimizeWindow(windowElement) {
  if (!windowElement) return;
  windowElement.classList.add('is-minimized');
  windowElement.classList.remove('is-active');
  const nextWindow = [...windows]
    .filter((item) => item !== windowElement && item.classList.contains('is-open') && !item.classList.contains('is-minimized'))
    .sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0))[0];
  if (nextWindow) focusWindow(nextWindow);
  syncTaskbar();
}

function toggleMaximize(windowElement) {
  if (!windowElement) return;
  focusWindow(windowElement);
  windowElement.classList.toggle('is-maximized');
}

function setWindowPosition(windowElement, left, top) {
  const maxLeft = Math.max(12, window.innerWidth - windowElement.offsetWidth - 12);
  const maxTop = Math.max(64, window.innerHeight - windowElement.offsetHeight - 64);
  windowElement.style.left = `${Math.min(Math.max(12, left), maxLeft)}px`;
  windowElement.style.top = `${Math.min(Math.max(64, top), maxTop)}px`;
}

updateClock();
setInterval(updateClock, 30000);

windows.forEach((windowElement) => {
  windowElement.addEventListener('pointerdown', () => focusWindow(windowElement));

  const handle = windowElement.querySelector('[data-drag-handle]');
  if (!handle) return;

  handle.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.window-control')) return;
    if (window.matchMedia('(max-width: 820px)').matches) return;
    if (windowElement.classList.contains('is-maximized')) return;

    focusWindow(windowElement);
    const rect = windowElement.getBoundingClientRect();
    activeDrag = {
      windowElement,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener('pointermove', (event) => {
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    setWindowPosition(activeDrag.windowElement, event.clientX - activeDrag.offsetX, event.clientY - activeDrag.offsetY);
  });

  handle.addEventListener('pointerup', () => {
    activeDrag = null;
  });
});

document.querySelectorAll('[data-open-window]').forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    const id = trigger.dataset.openWindow;
    if (!id) return;
    event.preventDefault();
    openWindow(id);
  });
});

document.querySelectorAll('[data-window-action]').forEach((control) => {
  control.addEventListener('click', (event) => {
    const windowElement = control.closest('[data-window-id]');
    const action = control.dataset.windowAction;
    event.stopPropagation();

    if (action === 'minimize') minimizeWindow(windowElement);
    if (action === 'maximize') toggleMaximize(windowElement);
    if (action === 'close') closeWindow(windowElement);
  });
});

document.querySelectorAll('.folder-list a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.folder-list a').forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
  });
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const activeWindow = windows.find((item) => item.classList.contains('is-active'));
  if (activeWindow && activeWindow.dataset.windowId !== 'welcome') {
    closeWindow(activeWindow);
  }
});

openWindow('welcome', true);
syncTaskbar();
