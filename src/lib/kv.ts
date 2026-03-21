import fs from "fs/promises";
import path from "path";
import type { DiscoveryResult } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "discoveries.json");
const TTL_SECONDS = 604800; // 7 days

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // Ignore error if directory already exists
  }
}

async function loadStore(): Promise<{ [key: string]: { data: DiscoveryResult; expiresAt: number } }> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    // If file doesn't exist or is invalid, return empty store
    return {};
  }
}

async function saveStore(store: { [key: string]: { data: DiscoveryResult; expiresAt: number } }) {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function pruneExpired(store: { [key: string]: { data: DiscoveryResult; expiresAt: number } }): boolean {
  const now = Date.now();
  let changed = false;
  for (const key of Object.keys(store)) {
    if (store[key].expiresAt < now) {
      delete store[key];
      changed = true;
    }
  }
  return changed;
}

// ── Public API ──

export async function saveDiscovery(discovery: DiscoveryResult): Promise<void> {
  const store = await loadStore();
  pruneExpired(store);
  
  store[discovery.id] = {
    data: discovery,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  };
  
  await saveStore(store);
}

export async function saveDiscoveries(discoveries: DiscoveryResult[]): Promise<void> {
  const store = await loadStore();
  pruneExpired(store);
  
  for (const d of discoveries) {
    store[d.id] = {
      data: d,
      expiresAt: Date.now() + TTL_SECONDS * 1000,
    };
  }
  
  await saveStore(store);
}

export async function getDiscoveryByKey(id: string): Promise<DiscoveryResult | null> {
  const store = await loadStore();
  pruneExpired(store);
  
  const entry = store[id];
  return entry ? entry.data : null;
}

export async function getDiscoveries(): Promise<DiscoveryResult[]> {
  const store = await loadStore();
  const pruned = pruneExpired(store);
  if (pruned) {
    await saveStore(store); // save pruned state
  }
  
  return Object.values(store)
    .map((entry) => entry.data)
    .sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());
}
