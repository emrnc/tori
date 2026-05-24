import electron from 'electron';
import { randomUUID } from 'node:crypto';
import fsSync from 'node:fs';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  addItem,
  getDbPath,
  getItems,
  getStorageFolder,
  getStoragePath,
  initStorage,
  setStoragePath,
  type Item,
  type ItemType,
  updateItem,
} from '../src/lib/storage.js';

const { app, BrowserWindow, dialog, ipcMain, net, protocol } = electron;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
const defaultStoragePath = path.join(os.homedir(), 'Documents', 'Tori');
let mainWindow: Electron.BrowserWindow | null = null;
const watchers: fsSync.FSWatcher[] = [];

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
const videoExtensions = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']);
const audioExtensions = new Set(['.mp3', '.wav', '.aac', '.flac', '.m4a']);
const contentTypes = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.mp4', 'video/mp4'],
  ['.mov', 'video/quicktime'],
  ['.avi', 'video/x-msvideo'],
  ['.mkv', 'video/x-matroska'],
  ['.webm', 'video/webm'],
  ['.mp3', 'audio/mpeg'],
  ['.wav', 'audio/wav'],
  ['.aac', 'audio/aac'],
  ['.flac', 'audio/flac'],
  ['.m4a', 'audio/mp4'],
]);

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mikoshi',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

function readDbSync(): Item[] {
  try {
    const contents = fsSync.readFileSync(getDbPath(), 'utf8');
    const parsed = JSON.parse(contents) as Partial<{ items: Item[] }>;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writeDbSync(items: Item[]): void {
  fsSync.writeFileSync(getDbPath(), `${JSON.stringify({ items }, null, 2)}\n`, 'utf8');
}

function getStorageConfigPath(): string {
  return path.join(app.getPath('userData'), 'storage.json');
}

function loadPersistedStoragePath(): void {
  try {
    const contents = fsSync.readFileSync(getStorageConfigPath(), 'utf8');
    const parsed = JSON.parse(contents) as Partial<{ storagePath: string }>;

    if (typeof parsed.storagePath === 'string' && parsed.storagePath.length > 0) {
      setStoragePath(parsed.storagePath);
    }
  } catch {
    setStoragePath(defaultStoragePath);
  }
}

function persistStoragePath(storagePath: string): void {
  fsSync.mkdirSync(path.dirname(getStorageConfigPath()), { recursive: true });
  fsSync.writeFileSync(getStorageConfigPath(), `${JSON.stringify({ storagePath }, null, 2)}\n`, 'utf8');
}

async function initAndCleanStorage(): Promise<Item[]> {
  await initStorage();

  let items = readDbSync();
  items = items.filter((item) => !item.filename || fsSync.existsSync(item.filename));

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  items = items.filter((item) => {
    if (item.archived && item.archived_at) {
      const archivedTime = new Date(item.archived_at).getTime();

      if (archivedTime < thirtyDaysAgo) {
        if (item.filename && fsSync.existsSync(item.filename)) {
          fsSync.unlinkSync(item.filename);
        }

        return false;
      }
    }

    return true;
  });

  writeDbSync(items);

  return items;
}

function watchStorageFolder(folderPath: string): void {
  const watcher = fsSync.watch(folderPath, (event, filename) => {
    if (event !== 'rename' || !filename) {
      return;
    }

    const fileName = filename.toString();
    const fullPath = path.join(folderPath, fileName);

    if (fsSync.existsSync(fullPath)) {
      return;
    }

    const items = readDbSync();
    const removed = items.find((item) => item.filename && item.filename.endsWith(fileName));

    if (!removed) {
      return;
    }

    const updated = items.filter((item) => item.id !== removed.id);
    writeDbSync(updated);
    mainWindow?.webContents.send('items:removed', removed.id);
  });

  watchers.push(watcher);
}

function startStorageWatchers(): void {
  for (const type of ['image', 'video', 'audio'] as const) {
    watchStorageFolder(getStorageFolder(type));
  }
}

function stopStorageWatchers(): void {
  while (watchers.length > 0) {
    watchers.pop()?.close();
  }
}

async function copyStorageContents(oldPath: string, newPath: string): Promise<void> {
  await fs.mkdir(newPath, { recursive: true });

  try {
    const entries = await fs.readdir(oldPath);

    for (const entry of entries) {
      const source = path.join(oldPath, entry);
      const destination = path.join(newPath, entry);

      if (path.resolve(source) === path.resolve(newPath)) {
        continue;
      }

      await fs.cp(source, destination, { recursive: true, force: true });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

function rewriteStorageFilenames(items: Item[], oldPath: string, newPath: string): Item[] {
  const oldRoot = path.resolve(oldPath);

  return items.map((item) => {
    if (!item.filename) {
      return item;
    }

    const filename = path.resolve(item.filename);

    if (filename !== oldRoot && !filename.startsWith(`${oldRoot}${path.sep}`)) {
      return item;
    }

    return {
      ...item,
      filename: path.join(newPath, path.relative(oldRoot, filename)),
    };
  });
}

function getStorageStats() {
  const items = readDbSync();
  const stats = {
    total: items.length,
    images: items.filter((item) => item.type === 'image').length,
    videos: items.filter((item) => item.type === 'video').length,
    audio: items.filter((item) => item.type === 'audio').length,
    links: items.filter((item) => item.type === 'link').length,
    sizeMB: 0,
  };

  items.forEach((item) => {
    if (item.filename && fsSync.existsSync(item.filename)) {
      const stat = fsSync.statSync(item.filename);
      stats.sizeMB += stat.size;
    }
  });

  stats.sizeMB = Math.round((stats.sizeMB / (1024 * 1024)) * 10) / 10;
  return stats;
}

async function changeStoragePath(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Choose Tori Storage Folder',
  });

  if (result.canceled || !result.filePaths[0]) {
    return null;
  }

  const oldPath = getStoragePath();
  const newPath = result.filePaths[0];

  if (path.resolve(oldPath) === path.resolve(newPath)) {
    return newPath;
  }

  const items = readDbSync();
  await copyStorageContents(oldPath, newPath);
  setStoragePath(newPath);
  await initStorage();
  writeDbSync(rewriteStorageFilenames(items, oldPath, newPath));
  persistStoragePath(newPath);
  stopStorageWatchers();
  startStorageWatchers();
  mainWindow?.webContents.send('items:changed');

  return newPath;
}

function getFileType(filePath: string): Extract<ItemType, 'image' | 'video' | 'audio'> | null {
  const extension = path.extname(filePath).toLowerCase();

  if (imageExtensions.has(extension)) {
    return 'image';
  }

  if (videoExtensions.has(extension)) {
    return 'video';
  }

  if (audioExtensions.has(extension)) {
    return 'audio';
  }

  return null;
}

async function importFiles(filePaths: string[]): Promise<Item[]> {
  await initStorage();

  const importedItems: Item[] = [];

  for (const filePath of filePaths) {
    const type = getFileType(filePath);

    if (!type) {
      continue;
    }

    const id = randomUUID();
    const originalName = path.basename(filePath);
    const destination = path.join(getStorageFolder(type), `${id}-${originalName}`);

    await fs.copyFile(filePath, destination);

    const item: Item = {
      id,
      type,
      title: path.basename(originalName, path.extname(originalName)),
      filename: destination,
      source_url: null,
      thumbnail: null,
      created_at: new Date().toISOString(),
      favourite: false,
      archived: false,
      archived_at: null,
      space: null,
      tags: [],
    };

    await addItem(item);
    importedItems.push(item);
  }

  return importedItems;
}

ipcMain.handle('storage:init', () => initAndCleanStorage());
ipcMain.handle('storage:getItems', () => getItems());
ipcMain.handle('storage:getPath', () => getStoragePath());
ipcMain.handle('storage:changePath', () => changeStoragePath());
ipcMain.handle('storage:getStats', () => getStorageStats());
ipcMain.handle('storage:addItem', (_event, item: Item) => addItem(item));
ipcMain.handle('storage:updateItem', (_event, id: string, updates: Partial<Item>) => updateItem(id, updates));
ipcMain.handle('storage:toggleFavourite', (_event, id: string) => {
  const items = readDbSync();
  const item = items.find((item) => item.id === id);

  if (!item) {
    return null;
  }

  item.favourite = !item.favourite;
  writeDbSync(items);
  return item;
});
ipcMain.handle('storage:archiveItem', (_event, id: string) => {
  const items = readDbSync();
  const item = items.find((item) => item.id === id);

  if (!item) {
    return null;
  }

  item.archived = true;
  item.archived_at = new Date().toISOString();
  writeDbSync(items);
  return item;
});
ipcMain.handle('storage:unarchiveItem', (_event, id: string) => {
  const items = readDbSync();
  const item = items.find((item) => item.id === id);

  if (!item) {
    return null;
  }

  item.archived = false;
  item.archived_at = null;
  writeDbSync(items);
  return item;
});
ipcMain.handle('storage:deleteItem', (_event, id: string) => {
  const items = readDbSync();
  const item = items.find((item) => item.id === id);

  if (item?.filename && fsSync.existsSync(item.filename)) {
    fsSync.unlinkSync(item.filename);
  }

  const updated = items.filter((item) => item.id !== id);
  writeDbSync(updated);
  mainWindow?.webContents.send('items:removed', id);
  return true;
});
ipcMain.handle('storage:importFiles', (_event, filePaths: string[]) => importFiles(filePaths));
ipcMain.handle('link:fetchOG', async (_event, url: string) => {
  try {
    const response = await net.fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Tori/1.0)',
      },
    });
    const html = await response.text();

    const getOG = (prop: string) => {
      const match =
        html.match(
          new RegExp(
            `<meta[^>]*property=['"](?:og:${prop}|twitter:${prop})['"][^>]*content=['"]([^'"]+)['"]`,
            'i',
          ),
        ) ||
        html.match(
          new RegExp(`<meta[^>]*content=['"]([^'"]+)['"][^>]*property=['"](?:og:${prop}|twitter:${prop})['"]`, 'i'),
        );

      return match ? match[1] : null;
    };

    const title = getOG('title') || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || new URL(url).hostname;
    const image = getOG('image');
    const description = getOG('description');
    const domain = new URL(url).origin;
    const favicon = `${domain}/favicon.ico`;

    return { title, image, description, favicon, url };
  } catch {
    return { error: 'Failed to fetch', url };
  }
});
ipcMain.handle(
  'link:saveLink',
  (
    _event,
    data: {
      url: string;
      title?: string | null;
      ogImage?: string | null;
      favicon?: string | null;
      description?: string | null;
    },
  ) => {
    const item: Item = {
      id: randomUUID(),
      type: 'link',
      title: data.title || new URL(data.url).hostname,
      filename: null,
      source_url: data.url,
      thumbnail: data.ogImage || null,
      favicon: data.favicon || null,
      description: data.description || null,
      created_at: new Date().toISOString(),
      favourite: false,
      archived: false,
      archived_at: null,
      space: null,
      tags: [],
    };
    const items = readDbSync();
    items.push(item);
    writeDbSync(items);
    return item;
  },
);
ipcMain.handle(
  'link:updateOG',
  (
    _event,
    id: string,
    ogData: {
      title?: string | null;
      image?: string | null;
      favicon?: string | null;
      description?: string | null;
    },
  ) => {
    const items = readDbSync();
    const item = items.find((item) => item.id === id);

    if (!item) {
      return null;
    }

    if (ogData.title) item.title = ogData.title;
    if (ogData.image) item.thumbnail = ogData.image;
    if (ogData.favicon) item.favicon = ogData.favicon;
    if (ogData.description) item.description = ogData.description;

    writeDbSync(items);
    return item;
  },
);
ipcMain.handle('dialog:openFile', () => {
  return dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] },
      { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
      { name: 'Audio', extensions: ['mp3', 'wav', 'aac', 'flac', 'm4a'] },
    ],
  });
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Tori',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 15 },
    backgroundColor: '#080808',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  if (isDev) {
    void win.loadURL('http://127.0.0.1:5173');
  } else {
    void win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow = win;
  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });
}

void app.whenReady().then(async () => {
  loadPersistedStoragePath();

  protocol.handle('mikoshi', async (request) => {
    const url = new URL(request.url);
    const decodedPath = decodeURIComponent(`${url.hostname ? `/${url.hostname}` : ''}${url.pathname}`);
    const data = await fs.readFile(decodedPath);
    const contentType = contentTypes.get(path.extname(decodedPath).toLowerCase()) ?? 'application/octet-stream';

    return new Response(data, {
      headers: {
        'content-type': contentType,
      },
    });
  });

  await initStorage();
  startStorageWatchers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  stopStorageWatchers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
