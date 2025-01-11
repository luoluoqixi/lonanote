import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import { BrowserWindow, app, globalShortcut, ipcMain, shell } from 'electron';
import type { TitleBarOverlay } from 'electron';
import path from 'path';

import icon from '../../resources/icon.png?asset';
import { initBindings } from './bindings';
import { settings } from './store';

let windows: BrowserWindow[] = [];

export const getActiveWin = () => {
  for (let i = 0; i < windows.length; i++) {
    const win = windows[i];
    if (!win.isFocused()) continue;
    return win;
  }
  return null;
};

export const getWindows = () => {
  return windows;
};

const getTitleBarOverlay = (zoom: number): TitleBarOverlay | undefined => {
  if (process.platform === 'darwin') return undefined;
  let height = settings.getZoomActualPx(zoom, settings.defaultTitleBarHeight);
  // 按钮只允许放大, 缩小设置上去其实也无效
  if (height < settings.defaultTitleBarHeight) {
    height = settings.defaultTitleBarHeight;
  }
  const symbolColor = settings.getTitleBarColor();
  const color = settings.getTitleBarBackgroudColor();
  return {
    color,
    symbolColor,
    height,
  };
};

const createWindow = async () => {
  const size = settings.getWindowSize();
  const win = new BrowserWindow({
    width: size.width,
    height: size.height,
    minWidth: settings.minWindowSize.width,
    minHeight: settings.minWindowSize.height,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: getTitleBarOverlay(settings.getZoom()),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false,
    },
  });

  windows.push(win);

  win.on('ready-to-show', () => {
    if (!win.isVisible()) {
      win.show();
    }
    if (is.dev) {
      win.webContents.openDevTools();
    }
  });

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    await win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    await win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.on('resize', () => {
    if (!win) return;
    const size = win.getSize();
    const width = size[0];
    const height = size[1];
    if (width > 0 && height > 0) {
      const size = { width, height };
      settings.setWindowSize(size);
      win.webContents.send('onWindowSizeChange', size);
    }
  });

  win.on('close', () => {
    windows = windows.filter((w) => w !== win);
  });

  const zoom = settings.getZoom();
  if (win.webContents.getZoomLevel() !== zoom) {
    win.webContents.setZoomLevel(zoom);
  }

  win.show();
};

export const setupApp = async () => {
  const setZoom = (zoom: number) => {
    if (zoom < settings.minZoom) return;
    if (zoom > settings.maxZoom) return;
    const activeWin = getActiveWin();
    if (!activeWin) return;
    activeWin.webContents.setZoomLevel(zoom);
    settings.setZoom(zoom);
    const titleBarOverlay = getTitleBarOverlay(zoom);
    for (let i = 0; i < windows.length; i++) {
      const win = windows[i];
      if (titleBarOverlay) {
        win?.setTitleBarOverlay(titleBarOverlay);
      }
      win?.webContents.send('onZoomChange', zoom);
    }
  };

  app.on('second-instance', () => {
    // 当用户尝试启动第二个实例时，创建新窗口
    createWindow();
  });

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    initBindings(ipcMain);

    // Set app user model id for windows
    electronApp.setAppUserModelId('com.lonalabs.lonanote');

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, win) => {
      optimizer.watchWindowShortcuts(win);
    });

    globalShortcut.unregister('CommandOrControl+Shift+i');
    globalShortcut.register('CommandOrControl+Shift+i', () => {
      for (let i = 0; i < windows.length; i++) {
        const win = windows[i];
        if (!win.isFocused()) continue;
        if (win.webContents.isDevToolsOpened()) {
          win.webContents.closeDevTools();
        } else {
          win.webContents.openDevTools();
        }
      }
    });
    globalShortcut.unregister('CommandOrControl+=');
    globalShortcut.unregister('CommandOrControl+-');
    globalShortcut.unregister('CommandOrControl+0');
    globalShortcut.register('CommandOrControl+=', () => {
      setZoom(settings.getZoom() + 1);
    });
    globalShortcut.register('CommandOrControl+-', () => {
      setZoom(settings.getZoom() - 1);
    });
    globalShortcut.register('CommandOrControl+0', () => {
      setZoom(0);
    });

    globalShortcut.unregister('CommandOrControl+Shift+n');

    globalShortcut.register('CommandOrControl+Shift+n', () => {
      createWindow();
    });

    ipcMain.handle('openNewWindow', () => {
      createWindow();
    });

    ipcMain.handle('setTitleBarColor', (e, color, backgroudColor) => {
      const win = getActiveWin();
      if (win && color) {
        settings.setTitleBarColor(color);
        settings.setTitleBarBackgroudColor(backgroudColor);
        const titleBarOverlay = getTitleBarOverlay(settings.getZoom());
        if (titleBarOverlay) {
          win.setTitleBarOverlay(titleBarOverlay);
        }
      }
    });

    ipcMain.handle('getZoom', () => {
      return settings.getZoom();
    });
    ipcMain.handle('setZoom', (_, zoom: number) => {
      if (zoom != null && zoom !== settings.getZoom()) {
        setZoom(zoom);
      }
    });
    ipcMain.handle('getWindowSize', () => {
      return settings.getWindowSize();
    });
    ipcMain.handle('resetWindowSize', () => {
      const win = getActiveWin();
      if (win) {
        const s = settings.defaultWindowSize;
        win.setSize(s.width, s.height);
        settings.setWindowSize(s);
      }
    });

    createWindow();

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
};
