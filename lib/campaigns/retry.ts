export function computeNextRetryAt(
  retryCount: number,
  now = new Date()
): Date {
  const minutes = Math.min(2 ** Math.max(retryCount, 0), 360);
  return new Date(now.getTime() + minutes * 60_000);
}

export const MAX_MAILING_RETRIES = 5;
