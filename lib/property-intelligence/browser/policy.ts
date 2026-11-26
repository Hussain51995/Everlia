import {
  coerceBrowserTtlSeconds,
  MAX_BROWSER_TTL_SECONDS,
  maxBrowserExpiryIso,
} from "@/lib/property-intelligence/browser/ttl";
import type {
  BrowserCacheRecord,
  BrowserCacheWriteInput,
  LegacyBrowserCacheRecordV1,
} from "@/lib/property-intelligence/browser/types";

export function computeBrowserExpiresAt(input: {
  now: Date;
  browserTtlSeconds: number;
  sourceCacheExpiresAt: string;
  responseContextValidUntil?: string | null;
  providerRetentionDeadline?: string | null;
}): string {
  const candidates: number[] = [];

  const cappedTtl = Math.min(
    Math.max(1, Math.floor(input.browserTtlSeconds)),
    MAX_BROWSER_TTL_SECONDS
  );
  const browserMs = input.now.getTime() + cappedTtl * 1000;
  candidates.push(browserMs);

  const sourceMs = Date.parse(input.sourceCacheExpiresAt);
  if (Number.isFinite(sourceMs)) candidates.push(sourceMs);

  if (input.responseContextValidUntil) {
    const ctxMs = Date.parse(input.responseContextValidUntil);
    if (Number.isFinite(ctxMs)) candidates.push(ctxMs);
  }

  if (input.providerRetentionDeadline) {
    const retMs = Date.parse(input.providerRetentionDeadline);
    if (Number.isFinite(retMs)) candidates.push(retMs);
  }

  candidates.push(Date.parse(maxBrowserExpiryIso(input.now)));

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
  const browserTtlSeconds = coerceBrowserTtlSeconds(input.browserTtlSeconds);
  return {
    writtenAt: now.toISOString(),
    browserExpiresAt: computeBrowserExpiresAt({
      now,
      browserTtlSeconds,
      sourceCacheExpiresAt: input.sourceCacheExpiresAt,
      responseContextValidUntil: input.responseContextValidUntil,
      providerRetentionDeadline: input.providerRetentionDeadline,
    }),
  };
}

export function normalizeBrowserCacheRecord(
  raw: BrowserCacheRecord | LegacyBrowserCacheRecordV1 | null | undefined
): BrowserCacheRecord | null {
  if (!raw || typeof raw !== "object") return null;

  const legacy = raw as LegacyBrowserCacheRecordV1;
  const sourceCacheExpiresAt =
    legacy.sourceCacheExpiresAt ??
    legacy.databaseExpiresAt ??
    null;

  if (!sourceCacheExpiresAt || !legacy.browserExpiresAt || !legacy.writtenAt) {
    return null;
  }

  const absoluteMax = Date.parse(maxBrowserExpiryIso(legacy.writtenAt));
  const declared = Date.parse(legacy.browserExpiresAt);
  if (!Number.isFinite(declared) || !Number.isFinite(absoluteMax)) {
    return null;
  }

  const cappedBrowserExpiresAt = new Date(
    Math.min(declared, absoluteMax)
  ).toISOString();

  return {
    responseContextId: legacy.responseContextId,
    propertyIdentityKey: legacy.propertyIdentityKey,
    category: legacy.category,
    providerId: legacy.providerId,
    schemaVersion: legacy.schemaVersion,
    categoryConfigVersion: legacy.categoryConfigVersion,
    invalidationVersion: legacy.invalidationVersion,
    providerFetchedAt: legacy.providerFetchedAt,
    sourceCacheExpiresAt,
    browserExpiresAt: cappedBrowserExpiresAt,
    data: legacy.data,
    writtenAt: legacy.writtenAt,
  };
}

export function legacyBrowserEntryExceedsMaxTtl(
  record: Pick<BrowserCacheRecord, "writtenAt" | "browserExpiresAt">
): boolean {
  const written = Date.parse(record.writtenAt);
  const expires = Date.parse(record.browserExpiresAt);
  if (!Number.isFinite(written) || !Number.isFinite(expires)) return true;
  const impliedSeconds = Math.floor((expires - written) / 1000);
  return impliedSeconds > MAX_BROWSER_TTL_SECONDS;
}
