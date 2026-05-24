import type { Item } from '../src/lib/storage.js';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mikoshi', {
  initStorage: () => ipcRenderer.invoke('storage:init') as Promise<Item[]>,
  getItems: () => ipcRenderer.invoke('storage:getItems') as Promise<Item[]>,
  getStoragePath: () => ipcRenderer.invoke('storage:getPath') as Promise<string>,
  changeStoragePath: () => ipcRenderer.invoke('storage:changePath') as Promise<string | null>,
  getStorageStats: () => ipcRenderer.invoke('storage:getStats') as Promise<{
    total: number;
    images: number;
    videos: number;
    audio: number;
    links: number;
    sizeMB: number;
  }>,
  addItem: (item: Item) => ipcRenderer.invoke('storage:addItem', item) as Promise<void>,
  updateItem: (id: string, updates: Partial<Item>) =>
    ipcRenderer.invoke('storage:updateItem', id, updates) as Promise<void>,
  toggleFavourite: (id: string) => ipcRenderer.invoke('storage:toggleFavourite', id) as Promise<Item | null>,
  archiveItem: (id: string) => ipcRenderer.invoke('storage:archiveItem', id) as Promise<Item | null>,
  unarchiveItem: (id: string) => ipcRenderer.invoke('storage:unarchiveItem', id) as Promise<Item | null>,
  deleteItem: (id: string) => ipcRenderer.invoke('storage:deleteItem', id) as Promise<boolean>,
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile') as Promise<Electron.OpenDialogReturnValue>,
  importFiles: (filePaths: string[]) => ipcRenderer.invoke('storage:importFiles', filePaths) as Promise<Item[]>,
  fetchOG: (url: string) => ipcRenderer.invoke('link:fetchOG', url) as Promise<{
    title: string;
    image: string | null;
    description: string | null;
    favicon: string | null;
    url: string;
    error?: string;
  }>,
  saveLink: (data: {
    url: string;
    title?: string | null;
    ogImage?: string | null;
    favicon?: string | null;
    description?: string | null;
  }) => ipcRenderer.invoke('link:saveLink', data) as Promise<Item>,
  updateOG: (
    id: string,
    ogData: {
      title?: string | null;
      image?: string | null;
      favicon?: string | null;
      description?: string | null;
    },
  ) => ipcRenderer.invoke('link:updateOG', id, ogData) as Promise<Item | null>,
  onItemRemoved: (callback: (id: string) => void) =>
    ipcRenderer.on('items:removed', (_event: Electron.IpcRendererEvent, id: string) => callback(id)),
  onItemsChanged: (callback: () => void) =>
    ipcRenderer.on('items:changed', () => callback()),
});
