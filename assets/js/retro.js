const clock = document.querySelector('#clock');
const taskbarApps = document.querySelector('#taskbarApps');
const windows = Array.from(document.querySelectorAll('[data-window-id]'));
let topZIndex = 100;
let activeDrag = null;
let secretBuffer = '';
const secretWord = 'coffee';

function isMobileViewport() {
  return window.matchMedia('(max-width: 820px)').matches;
}

function isTypingField(target) {
  return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
}

function setWindowHiddenState(windowElement, isHidden) {
  if (!windowElement) return;
  windowElement.setAttribute('aria-hidden', String(isHidden));
}

function getWindow(id) {
  return windows.find((windowElement) => windowElement.dataset.windowId === id);
}

function getWindowTitle(windowElement) {
  return windowElement?.querySelector('.window-titlebar > span:first-child')?.textContent?.trim()
    || windowElement?.dataset.windowId
    || 'window';
}

function getOpenWindowsForTaskbar() {
  return windows.filter((windowElement) => {
    const id = windowElement.dataset.windowId;
    if (id === 'coffee' && isMobileViewport()) return false;
    return windowElement.classList.contains('is-open');
  });
}

function syncTaskbar() {
  if (!taskbarApps) return;

  taskbarApps.innerHTML = '';

  getOpenWindowsForTaskbar().forEach((windowElement) => {
    const id = windowElement.dataset.windowId;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'taskbar-item is-running';
    button.dataset.openWindow = id;
    button.dataset.taskbarWindow = id;
    button.textContent = getWindowTitle(windowElement);

    if (windowElement.classList.contains('is-active')) {
      button.classList.add('is-active');
    }

    if (windowElement.classList.contains('is-minimized')) {
      button.classList.add('is-minimized');
    }

    button.addEventListener('click', (event) => {
      event.preventDefault();
      focusWindow(windowElement);
    });

    taskbarApps.appendChild(button);
  });
}

function showCoffeeToast() {
  let toast = document.querySelector('.coffee-unlock-toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'coffee-unlock-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = 'secret unlocked: coffee';
    document.body.appendChild(toast);
  }

  window.requestAnimationFrame(() => toast.classList.add('is-visible'));
  window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
}

function updateClock() {
  if (!clock) return;
  const now = new Date();
  clock.textContent = now.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function focusWindow(windowElement) {
  if (!windowElement) return;
  windows.forEach((item) => item.classList.remove('is-active'));
  windowElement.classList.add('is-active', 'is-open');
  windowElement.classList.remove('is-minimized');
  setWindowHiddenState(windowElement, false);
  topZIndex += 1;
  windowElement.style.zIndex = String(topZIndex);
  syncTaskbar();
}

function openWindow(id, shouldFocus = true) {
  if (id === 'coffee' && isMobileViewport()) return;

  const windowElement = getWindow(id);
  if (!windowElement) return;

  windowElement.classList.add('is-open');
  windowElement.classList.remove('is-minimized');
  setWindowHiddenState(windowElement, false);

  if (shouldFocus) focusWindow(windowElement);
  syncTaskbar();
}

function closeWindow(windowElement) {
  if (!windowElement) return;
  windowElement.classList.remove('is-open', 'is-active', 'is-minimized', 'is-maximized');
  setWindowHiddenState(windowElement, true);

  const nextWindow = [...windows]
    .filter((item) => item !== windowElement && item.classList.contains('is-open') && !item.classList.contains('is-minimized'))
    .sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0))[0];

  if (nextWindow) {
    focusWindow(nextWindow);
  } else {
    syncTaskbar();
  }
}

function minimizeWindow(windowElement) {
  if (!windowElement) return;
  windowElement.classList.add('is-minimized');
  windowElement.classList.remove('is-active');

  const nextWindow = [...windows]
    .filter((item) => item !== windowElement && item.classList.contains('is-open') && !item.classList.contains('is-minimized'))
    .sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0))[0];

  if (nextWindow) {
    focusWindow(nextWindow);
  } else {
    syncTaskbar();
  }
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
    if (isMobileViewport()) return;
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
  if (event.key === 'Escape') {
    const activeWindow = windows.find((item) => item.classList.contains('is-active'));
    if (activeWindow) closeWindow(activeWindow);
    return;
  }

  if (isMobileViewport()) return;
  if (isTypingField(event.target)) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.length !== 1) return;

  secretBuffer = `${secretBuffer}${event.key.toLowerCase()}`.slice(-secretWord.length);

  if (secretBuffer === secretWord) {
    openWindow('coffee');
    showCoffeeToast();
    secretBuffer = '';
  }
});


// Initial taskbar paint. Without this, welcome.txt is open but no running-app button is rendered yet.
syncTaskbar();

window.addEventListener('resize', () => {
  const coffeeWindow = getWindow('coffee');
  if (isMobileViewport() && coffeeWindow?.classList.contains('is-open')) {
    closeWindow(coffeeWindow);
  }
  syncTaskbar();
});

windows.forEach((windowElement) => {
  setWindowHiddenState(windowElement, !windowElement.classList.contains('is-open'));
});

openWindow('welcome', true);
syncTaskbar();
