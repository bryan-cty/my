(() => {
  const clock = document.querySelector('#clock');
  const taskbarApps = document.querySelector('#taskbarApps');
  const startButton = document.querySelector('#startButton');
  const startMenu = document.querySelector('#startMenu');
  const desktopShell = document.querySelector('.desktop-shell');
  const windows = Array.from(document.querySelectorAll('[data-window-id]'));

  let topZIndex = 100;
  let activeDrag = null;
  let secretBuffer = '';
  const secretWord = 'coffee';
  const desktopQuery = window.matchMedia('(min-width: 821px)');
  const mobileQuery = window.matchMedia('(max-width: 820px)');

  function isDesktop() {
    return desktopQuery.matches;
  }

  function isMobile() {
    return mobileQuery.matches;
  }

  function isTypingField(target) {
    return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
  }

  function isStartMenuOpen() {
    return Boolean(startMenu && !startMenu.hidden);
  }

  function setStartMenuOpen(isOpen) {
    if (!startMenu || !startButton) return;
    startMenu.hidden = !isOpen;
    startButton.setAttribute('aria-expanded', String(isOpen));
  }

  function toggleStartMenu() {
    setStartMenuOpen(!isStartMenuOpen());
  }

  function getWindow(id) {
    return windows.find((windowElement) => windowElement.dataset.windowId === id);
  }

  function getWindowTitle(windowElement) {
    return windowElement?.querySelector('.window-titlebar > span:first-child')?.textContent?.trim()
      || windowElement?.dataset.windowId
      || 'window';
  }

  function setWindowHiddenState(windowElement, isHidden) {
    if (!windowElement) return;
    windowElement.setAttribute('aria-hidden', String(isHidden));
  }

  function getVisibleMobileWindow() {
    return windows.find((windowElement) => (
      windowElement.classList.contains('is-open') &&
      !windowElement.classList.contains('is-minimized') &&
      windowElement.dataset.windowId !== 'coffee'
    ));
  }

  function updateMobileShellState() {
    document.body.classList.toggle('mobile-window-open', Boolean(isMobile() && getVisibleMobileWindow()));
  }

  function closeOtherMobileWindows(activeId) {
    if (!isMobile()) return;
    windows.forEach((windowElement) => {
      const id = windowElement.dataset.windowId;
      if (id === activeId) return;
      windowElement.classList.remove('is-open', 'is-active', 'is-minimized', 'is-maximized');
      setWindowHiddenState(windowElement, true);
    });
  }

  function getShellBounds() {
    const shell = desktopShell || document.documentElement;
    return {
      width: shell.clientWidth || window.innerWidth,
      height: shell.clientHeight || window.innerHeight,
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function cssNumber(windowElement, variableName, fallback) {
    const raw = window.getComputedStyle(windowElement).getPropertyValue(variableName).trim();
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  function fitWindow(windowElement, options = {}) {
    if (!windowElement || !isDesktop()) return;
    if (!windowElement.classList.contains('is-open')) return;
    if (windowElement.classList.contains('is-minimized')) return;
    if (windowElement.classList.contains('is-maximized')) return;

    const shell = getShellBounds();
    const gap = 14;
    const iconRail = shell.width >= 900 ? 156 : 120;
    const desiredWidth = cssNumber(windowElement, '--window-width', 760);
    const maxWidth = Math.max(320, shell.width - iconRail - gap * 2);
    const width = clamp(desiredWidth, 320, maxWidth);
    windowElement.style.width = `${width}px`;

    const hasUserPosition = windowElement.dataset.userPositioned === 'true';
    let left = Number.parseFloat(windowElement.style.left);
    let top = Number.parseFloat(windowElement.style.top);

    if (options.reset || !hasUserPosition || !Number.isFinite(left)) {
      left = cssNumber(windowElement, '--window-left', iconRail + gap);
    }
    if (options.reset || !hasUserPosition || !Number.isFinite(top)) {
      top = cssNumber(windowElement, '--window-top', gap);
    }

    const minLeft = iconRail;
    const maxLeft = Math.max(minLeft, shell.width - width - gap);
    left = clamp(left, minLeft, maxLeft);

    const minVisibleHeight = 210;
    const maxTop = Math.max(gap, shell.height - minVisibleHeight);
    top = clamp(top, gap, maxTop);

    windowElement.style.left = `${left}px`;
    windowElement.style.top = `${top}px`;

    const titlebar = windowElement.querySelector('.window-titlebar');
    const body = windowElement.querySelector('.window-body');
    const titlebarHeight = titlebar?.offsetHeight || 44;
    const maxHeight = Math.max(minVisibleHeight, shell.height - top - gap);
    const maxBodyHeight = Math.max(150, maxHeight - titlebarHeight - 8);

    windowElement.style.maxHeight = `${maxHeight}px`;
    if (body) body.style.maxHeight = `${maxBodyHeight}px`;
  }

  function fitOpenWindows() {
    windows.forEach((windowElement) => fitWindow(windowElement));
  }

  function getOpenWindowsForTaskbar() {
    return windows.filter((windowElement) => {
      if (windowElement.dataset.windowId === 'coffee' && !isDesktop()) return false;
      return windowElement.classList.contains('is-open');
    });
  }

  function syncTaskbar() {
    if (!taskbarApps) return;
    taskbarApps.innerHTML = '';

    const openWindows = getOpenWindowsForTaskbar();
    const visibleWindows = isMobile()
      ? openWindows.filter((windowElement) => !windowElement.classList.contains('is-minimized')).slice(-1)
      : openWindows;

    visibleWindows.forEach((windowElement) => {
      const id = windowElement.dataset.windowId;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'taskbar-item is-running';
      button.dataset.taskbarWindow = id;
      button.textContent = getWindowTitle(windowElement);

      if (windowElement.classList.contains('is-active')) button.classList.add('is-active');
      if (windowElement.classList.contains('is-minimized')) button.classList.add('is-minimized');

      button.addEventListener('click', (event) => {
        event.preventDefault();
        setStartMenuOpen(false);
        restoreOrFocusWindow(windowElement);
      });

      taskbarApps.appendChild(button);
    });

    updateMobileShellState();
  }

  function focusWindow(windowElement) {
    if (!windowElement) return;
    windows.forEach((item) => item.classList.remove('is-active'));
    topZIndex += 1;
    windowElement.style.zIndex = String(topZIndex);
    windowElement.classList.add('is-active');
    syncTaskbar();
  }

  function openWindow(id, shouldFocus = true) {
    const windowElement = getWindow(id);
    if (!windowElement) return;
    if (id === 'coffee' && !isDesktop()) return;

    if (isMobile()) {
      closeOtherMobileWindows(id);
      windowElement.classList.remove('is-maximized');
      windowElement.style.left = '';
      windowElement.style.top = '';
      windowElement.style.width = '';
      windowElement.style.maxHeight = '';
      const body = windowElement.querySelector('.window-body');
      if (body) body.style.maxHeight = '';
      document.body.classList.add('mobile-window-open');
    }

    windowElement.classList.add('is-open');
    windowElement.classList.remove('is-minimized');
    setWindowHiddenState(windowElement, false);
    fitWindow(windowElement);
    if (shouldFocus) focusWindow(windowElement);
    syncTaskbar();
  }

  function restoreOrFocusWindow(windowElement) {
    if (!windowElement) return;
    if (isMobile()) closeOtherMobileWindows(windowElement.dataset.windowId);
    windowElement.classList.add('is-open');
    windowElement.classList.remove('is-minimized');
    setWindowHiddenState(windowElement, false);
    fitWindow(windowElement);
    focusWindow(windowElement);
  }

  function closeWindow(windowElement) {
    if (!windowElement) return;
    windowElement.classList.remove('is-open', 'is-active', 'is-minimized', 'is-maximized');
    setWindowHiddenState(windowElement, true);

    if (!isMobile()) {
      const nextWindow = [...windows]
        .filter((item) => item !== windowElement && item.classList.contains('is-open') && !item.classList.contains('is-minimized'))
        .sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0))[0];

      if (nextWindow) focusWindow(nextWindow);
    }

    syncTaskbar();
    updateMobileShellState();
  }

  function minimizeWindow(windowElement) {
    if (!windowElement) return;
    if (isMobile()) {
      closeWindow(windowElement);
      return;
    }
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
    if (isMobile()) return;
    focusWindow(windowElement);
    windowElement.classList.toggle('is-maximized');
    if (!windowElement.classList.contains('is-maximized')) fitWindow(windowElement);
    syncTaskbar();
  }

  function setWindowPosition(windowElement, left, top) {
    if (!windowElement || !isDesktop()) return;
    windowElement.dataset.userPositioned = 'true';
    const shell = getShellBounds();
    const gap = 12;
    const width = windowElement.offsetWidth || cssNumber(windowElement, '--window-width', 760);
    const height = windowElement.offsetHeight || 280;
    const minLeft = shell.width >= 900 ? 132 : gap;
    const maxLeft = Math.max(minLeft, shell.width - width - gap);
    const maxTop = Math.max(gap, shell.height - Math.min(190, height));

    windowElement.style.left = `${clamp(left, minLeft, maxLeft)}px`;
    windowElement.style.top = `${clamp(top, gap, maxTop)}px`;
    fitWindow(windowElement);
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


  if (isMobile()) {
    windows.forEach((windowElement) => {
      windowElement.classList.remove('is-open', 'is-active', 'is-minimized', 'is-maximized');
      setWindowHiddenState(windowElement, true);
    });
    document.body.classList.remove('mobile-window-open');
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

  if (startButton) {
    startButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleStartMenu();
    });
  }

  if (startMenu) {
    startMenu.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  }

  document.addEventListener('click', (event) => {
    if (!isStartMenuOpen()) return;
    if (event.target.closest('#startMenu') || event.target.closest('#startButton')) return;
    setStartMenuOpen(false);
  });

  document.querySelectorAll('[data-open-window]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      const id = trigger.dataset.openWindow;
      if (!id) return;
      event.preventDefault();
      openWindow(id);
      if (trigger.closest('#startMenu')) setStartMenuOpen(false);
    });
  });

  windows.forEach((windowElement) => {
    windowElement.addEventListener('pointerdown', () => {
      if (windowElement.classList.contains('is-open') && !windowElement.classList.contains('is-minimized')) {
        focusWindow(windowElement);
      }
    });
  });

  document.querySelectorAll('[data-window-action]').forEach((control) => {
    control.addEventListener('click', (event) => {
      const windowElement = control.closest('[data-window-id]');
      const action = control.dataset.windowAction;
      event.preventDefault();
      event.stopPropagation();

      if (action === 'minimize') minimizeWindow(windowElement);
      if (action === 'maximize') toggleMaximize(windowElement);
      if (action === 'close') closeWindow(windowElement);
    });
  });

  document.querySelectorAll('[data-drag-handle]').forEach((handle) => {
    handle.addEventListener('pointerdown', (event) => {
      if (!isDesktop()) return;
      if (event.target.closest('[data-window-action]')) return;

      const windowElement = handle.closest('[data-window-id]');
      if (!windowElement || windowElement.classList.contains('is-maximized')) return;
      focusWindow(windowElement);

      const rect = windowElement.getBoundingClientRect();
      const shellRect = desktopShell?.getBoundingClientRect() || { left: 0, top: 0 };
      activeDrag = {
        windowElement,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        shellLeft: shellRect.left,
        shellTop: shellRect.top,
      };

      handle.setPointerCapture?.(event.pointerId);
    });

    handle.addEventListener('pointermove', (event) => {
      if (!activeDrag) return;
      const left = event.clientX - activeDrag.shellLeft - activeDrag.offsetX;
      const top = event.clientY - activeDrag.shellTop - activeDrag.offsetY;
      setWindowPosition(activeDrag.windowElement, left, top);
    });

    handle.addEventListener('pointerup', () => {
      activeDrag = null;
    });

    handle.addEventListener('pointercancel', () => {
      activeDrag = null;
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
      if (isStartMenuOpen()) {
        setStartMenuOpen(false);
        startButton?.focus();
        return;
      }

      const activeWindow = windows.find((item) => item.classList.contains('is-active'));
      if (activeWindow) closeWindow(activeWindow);
      return;
    }

    if (!isDesktop()) return;
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

  window.addEventListener('resize', () => {
    if (!isDesktop()) {
      const coffeeWindow = getWindow('coffee');
      if (coffeeWindow?.classList.contains('is-open')) closeWindow(coffeeWindow);
    }
    if (isDesktop()) {
      document.body.classList.remove('mobile-window-open');
    }
    fitOpenWindows();
    syncTaskbar();
  });

  updateClock();
  window.setInterval(updateClock, 1000 * 30);

  windows.forEach((windowElement) => {
    setWindowHiddenState(windowElement, !windowElement.classList.contains('is-open'));
  });

  if (isDesktop()) {
    openWindow('welcome', true);
  } else {
    windows.forEach((windowElement) => {
      windowElement.classList.remove('is-open', 'is-active', 'is-minimized', 'is-maximized');
      setWindowHiddenState(windowElement, true);
    });
  }
  fitOpenWindows();
  syncTaskbar();
  updateMobileShellState();
})();
