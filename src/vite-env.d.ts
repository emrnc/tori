/// <reference types="vite/client" />

import type { Item } from './lib/storage';

type StorageStats = {
  total: number;
  images: number;
  videos: number;
  audio: number;
  links: number;
  sizeMB: number;
};

type LinkPreview = {
  title: string;
  image: string | null;
  description: string | null;
  favicon: string | null;
  url: string;
  error?: string;
};

type SaveLinkData = {
  url: string;
  title?: string | null;
  ogImage?: string | null;
  favicon?: string | null;
  description?: string | null;
};

type UpdateOGData = {
  title?: string | null;
  image?: string | null;
  favicon?: string | null;
  description?: string | null;
};

type MikoshiApi = {
  initStorage: () => Promise<Item[]>;
  getItems: () => Promise<Item[]>;
  getStoragePath: () => Promise<string>;
  changeStoragePath: () => Promise<string | null>;
  getStorageStats: () => Promise<StorageStats>;
  addItem: (item: Item) => Promise<void>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  toggleFavourite: (id: string) => Promise<any>;
  archiveItem: (id: string) => Promise<any>;
  unarchiveItem: (id: string) => Promise<any>;
  deleteItem: (id: string) => Promise<boolean>;
  openFileDialog: () => Promise<{
    canceled: boolean;
    filePaths: string[];
  }>;
  importFiles: (filePaths: string[]) => Promise<Item[]>;
  fetchOG: (url: string) => Promise<LinkPreview>;
  saveLink: (data: SaveLinkData) => Promise<Item>;
  updateOG: (id: string, ogData: UpdateOGData) => Promise<Item | null>;
  onItemRemoved: (callback: (id: string) => void) => void;
  onItemsChanged: (callback: () => void) => void;
};

declare global {
  interface Window {
    mikoshi: MikoshiApi;
  }
}
