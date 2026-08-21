const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow, ipcMain } = require('electron');
const { startStaticServer } = require('./static-server.cjs');

/** @typedef {'pos' | 'erp'} StaffMode */

const MODE_URL = {
  pos: '/pos/',
  erp: '/erp/',
};

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {StaffMode} */
let currentMode = 'pos';
/** @type {{ apiUrl: string; defaultMode?: StaffMode }} */
let config = { apiUrl: 'http://localhost:4000', defaultMode: 'pos' };
/** @type {{ close: () => Promise<void>; origin: string } | null} */
let staticServer = null;

function configPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'config.json');
  }
  return path.join(__dirname, '..', 'config.json');
}

function rendererRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'renderer');
  }
  return path.join(__dirname, '..', 'renderer');
}

function loadConfig() {
  const file = configPath();
  if (!fs.existsSync(file)) {
    return;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed && typeof parsed.apiUrl === 'string' && parsed.apiUrl.trim()) {
      config.apiUrl = parsed.apiUrl.trim().replace(/\/$/, '');
    }
    if (parsed?.defaultMode === 'pos' || parsed?.defaultMode === 'erp') {
      config.defaultMode = parsed.defaultMode;
      currentMode = parsed.defaultMode;
    }
  } catch {
    // Keep defaults.
  }
}

function modeUrl(mode) {
  return `${staticServer.origin}${MODE_URL[mode]}`;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Jersey Staff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(modeUrl(currentMode));
}

function registerIpc() {
  ipcMain.handle('desktop:get-mode', () => currentMode);
  ipcMain.handle('desktop:get-api-url', () => config.apiUrl);
  ipcMain.handle('desktop:switch-mode', async (_event, mode) => {
    if (mode !== 'pos' && mode !== 'erp') {
      return currentMode;
    }
    if (mode === currentMode) {
      return currentMode;
    }
    currentMode = mode;
    if (mainWindow && !mainWindow.isDestroyed()) {
      await mainWindow.loadURL(modeUrl(mode));
    }
    return currentMode;
  });
}

app.whenReady().then(async () => {
  loadConfig();
  registerIpc();
  staticServer = await startStaticServer(rendererRoot(), () => config);
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (staticServer) {
    void staticServer.close();
    staticServer = null;
  }
});
