import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import { BrowserWindow, app, globalShortcut, ipcMain, shell } from 'electron';
import type { TitleBarOverlay } from 'electron';
import path from 'path';

import icon from '../../resources/icon.png?asset';
import { initInvokeIpc } from './bindings';
import { settings } from './store';

let mainWindow: BrowserWindow | undefined;

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

  initInvokeIpc(ipcMain, win);

  mainWindow = win;

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
      settings.setWindowSize({ width, height });
    }
  });

  win.on('close', () => {
    mainWindow = undefined;
  });

  const zoom = settings.getZoom();
  if (win.webContents.getZoomLevel() !== zoom) {
    win.webContents.setZoomLevel(zoom);
  }

  win.show();
};

export const setupApp = async () => {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.lonalabs.lonanote');

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, win) => {
      optimizer.watchWindowShortcuts(win);
      globalShortcut.unregister('CommandOrControl+Shift+i');
      globalShortcut.register('CommandOrControl+Shift+i', () => {
        if (!win) return;
        if (win.webContents.isDevToolsOpened()) {
          win.webContents.closeDevTools();
        } else {
          win.webContents.openDevTools();
        }
      });
      globalShortcut.unregister('CommandOrControl+=');
      globalShortcut.unregister('CommandOrControl+-');
      globalShortcut.unregister('CommandOrControl+0');
      const setZoom = (zoom: number) => {
        if (zoom < settings.minZoom) return;
        if (zoom > settings.maxZoom) return;
        win.webContents.setZoomLevel(zoom);
        settings.setZoom(zoom);
        const titleBarOverlay = getTitleBarOverlay(zoom);
        if (titleBarOverlay) {
          win.setTitleBarOverlay(titleBarOverlay);
        }
        win.webContents.send('onZoomChange', zoom);
      };
      globalShortcut.register('CommandOrControl+=', () => {
        if (!win) return;
        setZoom(settings.getZoom() + 1);
      });
      globalShortcut.register('CommandOrControl+-', () => {
        if (!win) return;
        setZoom(settings.getZoom() - 1);
      });
      globalShortcut.register('CommandOrControl+0', () => {
        if (!win) return;
        setZoom(0);
      });
    });

    ipcMain.handle('setTitleBarColor', (e, color, backgroudColor) => {
      if (mainWindow && color) {
        settings.setTitleBarColor(color);
        settings.setTitleBarBackgroudColor(backgroudColor);
        const titleBarOverlay = getTitleBarOverlay(settings.getZoom());
        if (titleBarOverlay) {
          mainWindow.setTitleBarOverlay(titleBarOverlay);
        }
      }
    });

    ipcMain.handle('getZoom', () => {
      return settings.getZoom();
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
