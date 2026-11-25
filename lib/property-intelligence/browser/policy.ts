import type { BrowserCacheWriteInput } from "@/lib/property-intelligence/browser/types";

export function computeBrowserExpiresAt(input: {
  now: Date;
  browserTtlSeconds: number;
  databaseExpiresAt: string;
  responseContextValidUntil?: string | null;
  providerRetentionDeadline?: string | null;
}): string {
  const candidates: number[] = [];

  const browserMs =
    input.now.getTime() + Math.max(1, input.browserTtlSeconds) * 1000;
  candidates.push(browserMs);

  const dbMs = Date.parse(input.databaseExpiresAt);
  if (Number.isFinite(dbMs)) candidates.push(dbMs);

  if (input.responseContextValidUntil) {
    const ctxMs = Date.parse(input.responseContextValidUntil);
    if (Number.isFinite(ctxMs)) candidates.push(ctxMs);
  }

  if (input.providerRetentionDeadline) {
    const retMs = Date.parse(input.providerRetentionDeadline);
    if (Number.isFinite(retMs)) candidates.push(retMs);
  }

  const earliest = Math.min(...candidates);
  return new Date(earliest).toISOString();
}

export function isBrowserRecordFresh(
  browserExpiresAt: string,
  now = new Date()
): boolean {
  const ms = Date.parse(browserExpiresAt);
  return Number.isFinite(ms) && ms > now.getTime();
}

export function remainingBrowserTtlSeconds(
  browserExpiresAt: string,
  now = new Date()
): number {
  const ms = Date.parse(browserExpiresAt);
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor((ms - now.getTime()) / 1000));
}

export function buildWriteTimestamps(input: BrowserCacheWriteInput): {
  writtenAt: string;
  browserExpiresAt: string;
} {
  const now = input.now ?? new Date();
  return {
    writtenAt: now.toISOString(),
    browserExpiresAt: computeBrowserExpiresAt({
      now,
      browserTtlSeconds: input.browserTtlSeconds,
      databaseExpiresAt: input.databaseExpiresAt,
      responseContextValidUntil: input.responseContextValidUntil,
      providerRetentionDeadline: input.providerRetentionDeadline,
    }),
  };
}
