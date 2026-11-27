import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FetchLockRecord = {
  id: string;
  lockKey: string;
  providerId: string;
  category: string;
  status: "claimed" | "completed" | "failed" | "expired";
  claimedAt: string;
  expiresAt: string;
  updatedAt: string;
};

export interface PropertyFetchLockRepository {
  expireStaleLocks(limit: number, nowIso?: string): Promise<number>;
  deleteTerminalLocks(olderThanIso: string, limit: number): Promise<number>;
}

export class MemoryPropertyFetchLockRepository
  implements PropertyFetchLockRepository
{
  readonly locks = new Map<string, FetchLockRecord>();

  seed(lock: Omit<FetchLockRecord, "id"> & { id?: string }) {
    const id = lock.id ?? randomUUID();
    this.locks.set(id, { ...lock, id });
    return id;
  }

  async expireStaleLocks(limit: number, nowIso?: string): Promise<number> {
    const now = Date.parse(nowIso ?? new Date().toISOString());
    const claimed = [...this.locks.values()]
      .filter(
        (l) => l.status === "claimed" && Date.parse(l.expiresAt) <= now
      )
      .sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt))
      .slice(0, Math.max(1, Math.min(limit, 1000)));

    const at = new Date(now).toISOString();
    for (const lock of claimed) {
      this.locks.set(lock.id, {
        ...lock,
        status: "expired",
        updatedAt: at,
      });
    }
    return claimed.length;
  }

  async deleteTerminalLocks(
    olderThanIso: string,
    limit: number
  ): Promise<number> {
    const cutoff = Date.parse(olderThanIso);
    const terminal = [...this.locks.values()]
      .filter(
        (l) =>
          (l.status === "completed" ||
            l.status === "failed" ||
            l.status === "expired") &&
          Date.parse(l.updatedAt) <= cutoff
      )
      .slice(0, Math.max(1, Math.min(limit, 1000)));

    for (const lock of terminal) {
      this.locks.delete(lock.id);
    }
    return terminal.length;
  }
}

export class SupabasePropertyFetchLockRepository
  implements PropertyFetchLockRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async expireStaleLocks(limit: number, _nowIso?: string): Promise<number> {
    void _nowIso;
    const { data, error } = await this.client.rpc(
      "property_intelligence_expire_stale_locks",
      { p_limit: Math.max(1, Math.min(limit, 1000)) }
    );
    if (error) throw new Error(error.message);
    return typeof data === "number" ? data : Number(data ?? 0);
  }

  async deleteTerminalLocks(
    olderThanIso: string,
    limit: number
  ): Promise<number> {
    const capped = Math.max(1, Math.min(limit, 1000));
    const { data: rows, error: selectError } = await this.client
      .from("property_intelligence_fetch_locks")
      .select("id")
      .in("status", ["completed", "failed", "expired"])
      .lte("updated_at", olderThanIso)
      .limit(capped);
    if (selectError) throw new Error(selectError.message);
    const ids = (rows ?? []).map((r) => String(r.id));
    if (ids.length === 0) return 0;
    const { data, error } = await this.client
      .from("property_intelligence_fetch_locks")
      .delete()
      .in("id", ids)
      .select("id");
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }
}
