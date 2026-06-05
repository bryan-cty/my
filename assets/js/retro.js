const clock = document.querySelector('#clock');
const taskbarApps = document.querySelector('#taskbarApps');
const windows = Array.from(document.querySelectorAll('[data-window-id]'));
const desktopShell = document.querySelector('.desktop-shell');
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
  fitWindowToViewport(windowElement);
  syncTaskbar();
}

function openWindow(id, shouldFocus = true) {
  if (id === 'coffee' && isMobileViewport()) return;

  const windowElement = getWindow(id);
  if (!windowElement) return;

  windowElement.classList.add('is-open');
  windowElement.classList.remove('is-minimized');
  setWindowHiddenState(windowElement, false);

  fitWindowToViewport(windowElement);
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
  if (!windowElement.classList.contains('is-maximized')) fitWindowToViewport(windowElement);
  syncTaskbar();
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCssNumber(windowElement, variableName, fallback) {
  const raw = window.getComputedStyle(windowElement).getPropertyValue(variableName).trim();
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

function getShellBounds() {
  const shell = desktopShell || document.documentElement;
  return {
    width: shell.clientWidth || window.innerWidth,
    height: shell.clientHeight || window.innerHeight,
  };
}

function fitWindowToViewport(windowElement, options = {}) {
  if (!windowElement || isMobileViewport()) return;
  if (!windowElement.classList.contains('is-open')) return;
  if (windowElement.classList.contains('is-maximized')) return;

  const { width: shellWidth, height: shellHeight } = getShellBounds();
  const gap = 14;
  const iconRail = shellWidth >= 960 ? 152 : 118;
  const desiredWidth = getCssNumber(windowElement, '--window-width', 760);
  const maxWidth = Math.max(320, shellWidth - iconRail - gap * 2);
  const width = clampNumber(desiredWidth, 320, maxWidth);

  windowElement.style.width = `${width}px`;

  const hasUserPosition = windowElement.dataset.userPositioned === 'true';
  const desiredLeft = getCssNumber(windowElement, '--window-left', iconRail + gap);
  const desiredTop = getCssNumber(windowElement, '--window-top', gap);

  let currentLeft = Number.parseFloat(windowElement.style.left);
  let currentTop = Number.parseFloat(windowElement.style.top);

  if (options.reset || !hasUserPosition || !Number.isFinite(currentLeft)) currentLeft = desiredLeft;
  if (options.reset || !hasUserPosition || !Number.isFinite(currentTop)) currentTop = desiredTop;

  const minLeft = shellWidth >= 760 ? iconRail : gap;
  const maxLeft = Math.max(minLeft, shellWidth - width - gap);

  // Keep at least a small visible body area. The real content scrolls inside .window-body.
  const minVisibleWindowHeight = 210;
  const maxTop = Math.max(gap, shellHeight - minVisibleWindowHeight);
  const left = clampNumber(currentLeft, minLeft, maxLeft);
  const top = clampNumber(currentTop, gap, maxTop);

  windowElement.style.left = `${left}px`;
  windowElement.style.top = `${top}px`;

  const titlebar = windowElement.querySelector('.window-titlebar');
  const body = windowElement.querySelector('.window-body');
  const titlebarHeight = titlebar?.offsetHeight || 44;
  const maxWindowHeight = Math.max(minVisibleWindowHeight, shellHeight - top - gap);
  const maxBodyHeight = Math.max(150, maxWindowHeight - titlebarHeight - 8);

  windowElement.style.maxHeight = `${maxWindowHeight}px`;
  if (body) body.style.maxHeight = `${maxBodyHeight}px`;
}

function fitAllOpenWindows() {
  windows.forEach((windowElement) => fitWindowToViewport(windowElement));
}

function setWindowPosition(windowElement, left, top) {
  if (!windowElement) return;
  windowElement.dataset.userPositioned = 'true';
  const { width: shellWidth, height: shellHeight } = getShellBounds();
  const gap = 12;
  const width = windowElement.offsetWidth || getCssNumber(windowElement, '--window-width', 760);
  const maxLeft = Math.max(gap, shellWidth - width - gap);
  const maxTop = Math.max(gap, shellHeight - 180);
  windowElement.style.left = `${clampNumber(left, gap, maxLeft)}px`;
  windowElement.style.top = `${clampNumber(top, gap, maxTop)}px`;
  fitWindowToViewport(windowElement);
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
    const shellRect = (desktopShell || document.body).getBoundingClientRect();
    setWindowPosition(
      activeDrag.windowElement,
      event.clientX - shellRect.left - activeDrag.offsetX,
      event.clientY - shellRect.top - activeDrag.offsetY
    );
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


// Initial desktop fit + taskbar paint.
fitAllOpenWindows();
syncTaskbar();

window.addEventListener('resize', () => {
  const coffeeWindow = getWindow('coffee');
  if (isMobileViewport() && coffeeWindow?.classList.contains('is-open')) {
    closeWindow(coffeeWindow);
  }
  fitAllOpenWindows();
  syncTaskbar();
});

windows.forEach((windowElement) => {
  setWindowHiddenState(windowElement, !windowElement.classList.contains('is-open'));
});

openWindow('welcome', true);
syncTaskbar();
