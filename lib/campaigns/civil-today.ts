import type { CivilDate } from "@/lib/campaigns/occasions/types";
import { formatCivilDate } from "@/lib/campaigns/occasions/calendar";

export function todayInTimezone(timezone: string, now = new Date()): CivilDate {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);

    const year = Number(parts.find((p) => p.type === "year")?.value);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const day = Number(parts.find((p) => p.type === "day")?.value);
    if (!year || !month || !day) {
      return formatCivilDate(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        now.getUTCDate()
      );
    }
    return formatCivilDate(year, month, day);
  } catch {
    return formatCivilDate(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      now.getUTCDate()
    );
  }
}
