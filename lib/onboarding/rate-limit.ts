
type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now();
  const windowStart = now - options.windowMs;
  const existing = buckets.get(options.key) ?? { timestamps: [] };
  const recent = existing.timestamps.filter((ts) => ts > windowStart);

  if (recent.length >= options.limit) {
    const oldest = recent[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + options.windowMs - now) / 1000)
    );
    buckets.set(options.key, { timestamps: recent });
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  recent.push(now);
  buckets.set(options.key, { timestamps: recent });
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - recent.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitBuckets() {
  buckets.clear();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export async function hashRateLimitIdentity(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
