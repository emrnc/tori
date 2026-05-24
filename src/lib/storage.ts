import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type ItemType = 'image' | 'video' | 'link' | 'audio' | 'tweet';

export type Item = {
  id: string;
  type: ItemType;
  title: string;
  filename: string | null;
  source_url: string | null;
  thumbnail: string | null;
  favicon?: string | null;
  description?: string | null;
  created_at: string;
  favourite: boolean;
  archived: boolean;
  archived_at: string | null;
  space: string | null;
  tags: string[];
};

type Database = {
  items: Item[];
};

export const storageFolders: ItemType[] = ['image', 'video', 'link', 'audio', 'tweet'];

const defaultStoragePath = path.join(os.homedir(), 'Documents', 'Tori');
let storagePath = defaultStoragePath;

const folderByType: Record<ItemType, string> = {
  image: 'images',
  video: 'videos',
  link: 'links',
  audio: 'audio',
  tweet: 'tweets',
};

export function getStoragePath() {
  return storagePath;
}

export function setStoragePath(pathname: string) {
  storagePath = pathname;
}

export function getDbPath() {
  return path.join(storagePath, 'db.json');
}

export function getStorageFolder(type: ItemType) {
  return path.join(storagePath, folderByType[type]);
}

async function readDatabase(): Promise<Database> {
  await initStorage();

  const contents = await fs.readFile(getDbPath(), 'utf8');
  const parsed = JSON.parse(contents) as Partial<Database>;

  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
}

async function writeDatabase(database: Database): Promise<void> {
  await fs.writeFile(getDbPath(), `${JSON.stringify({ items: database.items }, null, 2)}\n`, 'utf8');
}

export async function initStorage(): Promise<void> {
  await fs.mkdir(storagePath, { recursive: true });

  await Promise.all(storageFolders.map((type) => fs.mkdir(getStorageFolder(type), { recursive: true })));

  try {
    await fs.access(getDbPath());
  } catch {
    await writeDatabase({ items: [] });
  }
}

export async function getItems(): Promise<Item[]> {
  const database = await readDatabase();
  return database.items;
}

export async function addItem(item: Item): Promise<void> {
  const database = await readDatabase();
  database.items.push(item);
  await writeDatabase(database);
}

export async function updateItem(id: string, updates: Partial<Item>): Promise<void> {
  const database = await readDatabase();
  database.items = database.items.map((item) => (item.id === id ? { ...item, ...updates, id: item.id } : item));
  await writeDatabase(database);
}

export async function deleteItem(id: string): Promise<void> {
  const database = await readDatabase();
  database.items = database.items.filter((item) => item.id !== id);
  await writeDatabase(database);
}
