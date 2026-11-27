
export type BrowserCacheMissReason = string;

export type BrowserCacheTelemetrySnapshot = {
  hits: number;
  misses: number;
  missReasons: Record<string, number>;
  sampleRate: number;
};

export type BrowserCacheTelemetryOptions = {
  sampleRate?: number;
  random?: () => number;
  onFlush?: (snapshot: BrowserCacheTelemetrySnapshot) => void;
  flushEveryEvents?: number;
};

export class BrowserCacheTelemetry {
  private hits = 0;
  private misses = 0;
  private missReasons: Record<string, number> = {};
  private eventsSinceFlush = 0;
  private readonly sampleRate: number;
  private readonly random: () => number;
  private readonly onFlush?: (snapshot: BrowserCacheTelemetrySnapshot) => void;
  private readonly flushEveryEvents: number;

  constructor(options?: BrowserCacheTelemetryOptions) {
    this.sampleRate = options?.sampleRate ?? 1;
    this.random = options?.random ?? Math.random;
    this.onFlush = options?.onFlush;
    this.flushEveryEvents = options?.flushEveryEvents ?? 50;
  }

  private sampled(): boolean {
    return this.random() <= this.sampleRate;
  }

  recordHit() {
    if (!this.sampled()) return;
    this.hits += 1;
    this.bumpFlush();
  }

  recordMiss(reason: BrowserCacheMissReason) {
    if (!this.sampled()) return;
    this.misses += 1;
    this.missReasons[reason] = (this.missReasons[reason] ?? 0) + 1;
    this.bumpFlush();
  }

  getSnapshot(): BrowserCacheTelemetrySnapshot {
    return {
      hits: this.hits,
      misses: this.misses,
      missReasons: { ...this.missReasons },
      sampleRate: this.sampleRate,
    };
  }

  reset() {
    this.hits = 0;
    this.misses = 0;
    this.missReasons = {};
    this.eventsSinceFlush = 0;
  }

  private bumpFlush() {
    this.eventsSinceFlush += 1;
    if (
      this.onFlush &&
      this.eventsSinceFlush >= this.flushEveryEvents
    ) {
      this.onFlush(this.getSnapshot());
      this.eventsSinceFlush = 0;
    }
  }
}

export function createBrowserCacheTelemetry(
  options?: BrowserCacheTelemetryOptions
): BrowserCacheTelemetry {
  return new BrowserCacheTelemetry(options);
}
