import { kv } from "@vercel/kv";
import type { DiscoveryResult } from "./types";

const KV_PREFIX = "discovery:";
const TTL_SECONDS = 604800; // 7 days

// ── In-memory fallback for local dev (when KV is not configured) ──
const memoryStore = new Map<string, { data: DiscoveryResult; expiresAt: number }>();

function isKvConfigured(): boolean {
  return !!(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt < now) {
      memoryStore.delete(key);
    }
  }
}

// ── Public API ──

export async function saveDiscovery(
  discovery: DiscoveryResult
): Promise<void> {
  const key = `${KV_PREFIX}${discovery.id}`;

  if (isKvConfigured()) {
    await kv.set(key, discovery, { ex: TTL_SECONDS });
  } else {
    memoryStore.set(key, {
      data: discovery,
      expiresAt: Date.now() + TTL_SECONDS * 1000,
    });
  }
}

export async function saveDiscoveries(
  discoveries: DiscoveryResult[]
): Promise<void> {
  for (const d of discoveries) {
    await saveDiscovery(d);
  }
}

export async function getDiscoveryByKey(
  id: string
): Promise<DiscoveryResult | null> {
  const key = `${KV_PREFIX}${id}`;

  if (isKvConfigured()) {
    return await kv.get<DiscoveryResult>(key);
  }

  pruneExpired();
  const entry = memoryStore.get(key);
  return entry ? entry.data : null;
}

export async function getDiscoveries(): Promise<DiscoveryResult[]> {
  if (isKvConfigured()) {
    // Scan all keys with our prefix
    const keys: string[] = [];
    let cursor: string | number = 0;
    do {
      const result: [string, string[]] = await kv.scan(cursor, {
        match: `${KV_PREFIX}*`,
        count: 100,
      });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== "0");

    if (keys.length === 0) return [];

    const results = await Promise.all(
      keys.map((key) => kv.get<DiscoveryResult>(key))
    );
    return results.filter((r): r is DiscoveryResult => r !== null);
  }

  // In-memory fallback
  pruneExpired();
  return Array.from(memoryStore.values()).map((entry) => entry.data);
}
