import Redis from "ioredis";
import { Redis as UpstashRedis } from "@upstash/redis";

const REDIS_URL = process.env.REDIS_URL;
const UPSTASH_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

interface Backend {
  kind: "upstash" | "ioredis";
  upstash?: UpstashRedis;
  redis?: Redis;
}

const memoryStore = new Map<string, MemoryEntry>();

let backend: Backend | null = null;
let backendPromise: Promise<Backend | null> | null = null;

function makeUpstashBackend(): Backend | null {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) return null;
  try {
    return {
      kind: "upstash",
      upstash: new UpstashRedis({
        url: UPSTASH_REST_URL,
        token: UPSTASH_REST_TOKEN,
        automaticDeserialization: false,
      }),
    };
  } catch {
    return null;
  }
}

function makeIoredisBackend(): Promise<Backend | null> {
  if (!REDIS_URL) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const redis = new Redis(REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 3_000,
        retryStrategy: (times) => Math.min(times * 500, 2_000),
      });
      redis.on("error", () => {});
      redis
        .connect()
        .then(() => {
          backend = { kind: "ioredis", redis };
          resolve(backend);
        })
        .catch(() => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

function getBackend(): Promise<Backend | null> {
  if (backend) return Promise.resolve(backend);

  const upstash = makeUpstashBackend();
  if (upstash) {
    backend = upstash;
    return Promise.resolve(upstash);
  }

  if (!REDIS_URL) return Promise.resolve(null);
  if (!backendPromise) backendPromise = makeIoredisBackend();
  return backendPromise;
}

export function isRedisConfigured(): boolean {
  return (
    (!!UPSTASH_REST_URL && !!UPSTASH_REST_TOKEN) || !!REDIS_URL
  );
}

export async function redisPing(): Promise<boolean> {
  try {
    const target = await getBackend();
    if (!target) return false;
    if (target.kind === "upstash") {
      const pong = await target.upstash!.ping();
      return pong === "PONG";
    }
    const pong = await target.redis!.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

export async function redisGet<T>(key: string): Promise<T | null> {
  const now = Date.now();
  const mem = memoryStore.get(key);
  if (mem && mem.expiresAt > now) {
    try {
      return JSON.parse(mem.value) as T;
    } catch {
      return null;
    }
  }

  const target = await getBackend();
  if (!target) return null;

  try {
    const raw =
      target.kind === "upstash"
        ? await target.upstash!.get<string>(key)
        : await target.redis!.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSet(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch {
    return;
  }

  memoryStore.set(key, {
    value: raw,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity,
  });

  const target = await getBackend();
  if (!target) return;

  try {
    if (target.kind === "upstash") {
      if (ttlSeconds) {
        await target.upstash!.set(key, raw, { ex: ttlSeconds });
      } else {
        await target.upstash!.set(key, raw);
      }
    } else if (ttlSeconds) {
      await target.redis!.set(key, raw, "EX", ttlSeconds);
    } else {
      await target.redis!.set(key, raw);
    }
  } catch {}
}

export async function redisDel(key: string): Promise<void> {
  memoryStore.delete(key);

  const target = await getBackend();
  if (!target) return;

  try {
    if (target.kind === "upstash") {
      await target.upstash!.del(key);
    } else {
      await target.redis!.del(key);
    }
  } catch {}
}