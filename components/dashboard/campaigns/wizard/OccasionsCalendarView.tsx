"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckIcon,
  ChevronRightIcon,
  GiftIcon,
  HomeIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import { OccasionPreviewCard } from "@/components/dashboard/campaigns/wizard/OccasionPreviewCard";
import {
  categoryLabel,
  categoryStyle,
  occasionIcon,
  type TileModel,
} from "@/components/dashboard/campaigns/wizard/occasions-step-shared";
import {
  displayDatesForCustomOccurrence,
  displayDatesForOccasionInYear,
  formatCivilDate,
  isWithinInclusive,
  parseCivilDate,
  type CivilDate,
} from "@/lib/campaigns/occasions";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalendarEvent = {
  tile: TileModel;
  date: CivilDate;
  dateRole: "actual" | "observed";
};

type DayCell = {
  date: CivilDate;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  inCampaign: boolean;
  events: CalendarEvent[];
};

type Props = {
  tiles: TileModel[];
  previewKey: string | null;
  campaignStart: string;
  campaignEnd: string;
  onPreview: (key: string) => void;
  onToggle: (tile: TileModel) => void;
  onEdit: (tile: TileModel) => void;
};

function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function todayCivil(): CivilDate {
  const now = new Date();
  return formatCivilDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function buildMonthGrid(
  year: number,
  month: number,
  eventsByDate: Map<string, CalendarEvent[]>,
  campaignStart: string,
  campaignEnd: string,
  today: CivilDate
): DayCell[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prevMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();

  const cells: DayCell[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    const day = prevMonthDays - firstWeekday + i + 1;
    const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    const date = formatCivilDate(prev.year, prev.month, day);
    cells.push({
      date,
      day,
      inMonth: false,
      isToday: date === today,
      inCampaign: isWithinInclusive(date, campaignStart, campaignEnd),
      events: [],
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = formatCivilDate(year, month, day);
    cells.push({
      date,
      day,
      inMonth: true,
      isToday: date === today,
      inCampaign: isWithinInclusive(date, campaignStart, campaignEnd),
      events: eventsByDate.get(date) ?? [],
    });
  }

  let nextDay = 1;
  while (cells.length < 42) {
    const next =
      month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
    const date = formatCivilDate(next.year, next.month, nextDay);
    cells.push({
      date,
      day: nextDay,
      inMonth: false,
      isToday: date === today,
      inCampaign: isWithinInclusive(date, campaignStart, campaignEnd),
      events: [],
    });
    nextDay += 1;
  }

  return cells;
}

export function OccasionsCalendarView({
  tiles,
  previewKey,
  campaignStart,
  campaignEnd,
  onPreview,
  onToggle,
  onEdit,
}: Props) {
  const campaignStartParsed = parseCivilDate(campaignStart);
  const initial = campaignStartParsed ?? parseCivilDate(todayCivil())!;
  const [cursor, setCursor] = useState({
    year: initial.year,
    month: initial.month,
  });
  const [selectedDate, setSelectedDate] = useState<CivilDate | null>(null);
  const [direction, setDirection] = useState(0);
  const today = todayCivil();

  const milestoneTiles = useMemo(
    () =>
      tiles.filter(
        (t) =>
          t.catalog?.kind === "customer_milestone" ||
          (!t.catalog && !t.occurrenceDate)
      ),
    [tiles]
  );

  const datedTiles = useMemo(
    () =>
      tiles.filter(
        (t) =>
          Boolean(t.catalog && t.catalog.kind !== "customer_milestone") ||
          Boolean(t.occurrenceDate)
      ),
    [tiles]
  );

  const monthEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    for (const tile of datedTiles) {
      if (tile.catalog) {
        for (const d of displayDatesForOccasionInYear(
          tile.catalog,
          cursor.year
        )) {
          const parsed = parseCivilDate(d.date);
          if (!parsed || parsed.month !== cursor.month) continue;
          events.push({ tile, date: d.date, dateRole: d.dateRole });
        }
      } else if (tile.occurrenceDate) {
        for (const d of displayDatesForCustomOccurrence(
          tile.occurrenceDate,
          cursor.year,
          cursor.month
        )) {
          events.push({ tile, date: d.date, dateRole: d.dateRole });
        }
      }
    }
    return events;
  }, [datedTiles, cursor.year, cursor.month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of monthEvents) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        const aOn = a.tile.isSelected && a.tile.isEnabled ? 0 : 1;
        const bOn = b.tile.isSelected && b.tile.isEnabled ? 0 : 1;
        if (aOn !== bOn) return aOn - bOn;
        return a.tile.name.localeCompare(b.tile.name);
      });
    }
    return map;
  }, [monthEvents]);

  const cells = useMemo(
    () =>
      buildMonthGrid(
        cursor.year,
        cursor.month,
        eventsByDate,
        campaignStart,
        campaignEnd,
        today
      ),
    [cursor.year, cursor.month, eventsByDate, campaignStart, campaignEnd, today]
  );

  useEffect(() => {
    const inMonth = cells.find((c) => c.inMonth && c.events.length > 0);
    const todayCell = cells.find((c) => c.inMonth && c.isToday);
    const preferred = todayCell?.events.length
      ? todayCell
      : inMonth ?? todayCell ?? cells.find((c) => c.inMonth);
    if (!preferred) return;
    if (selectedDate && cells.some((c) => c.date === selectedDate && c.inMonth)) {
      return;
    }
    setSelectedDate(preferred.date);
  }, [cells, selectedDate]);

  const selectedEvents = selectedDate
    ? eventsByDate.get(selectedDate) ?? []
    : [];
  const previewTile =
    tiles.find((t) => t.key === previewKey) ??
    selectedEvents[0]?.tile ??
    null;

  const selectedCountInMonth = monthEvents.filter(
    (e) => e.tile.isSelected && e.tile.isEnabled
  ).length;

  const shiftMonth = (delta: number) => {
    setDirection(delta);
    setCursor((c) => {
      const date = new Date(Date.UTC(c.year, c.month - 1 + delta, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
    });
    setSelectedDate(null);
  };

  const goToCampaignStart = () => {
    if (!campaignStartParsed) return;
    setDirection(
      campaignStartParsed.year * 12 +
        campaignStartParsed.month -
        (cursor.year * 12 + cursor.month)
    );
    setCursor({
      year: campaignStartParsed.year,
      month: campaignStartParsed.month,
    });
    setSelectedDate(campaignStart);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
        <div className="flex min-h-[720px] flex-col overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white shadow-sm xl:h-full xl:min-h-[760px]">
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#0B1F3D] via-[#123456] to-[#0E7490] px-4 py-4 text-white sm:px-5">
            <div
              className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 left-10 h-36 w-36 rounded-full bg-[#38B2D1]/30 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                  Campaign calendar
                </p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h3
                    key={`${cursor.year}-${cursor.month}`}
                    initial={{ opacity: 0, y: direction >= 0 ? 8 : -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: direction >= 0 ? -8 : 8 }}
                    transition={{ duration: 0.22 }}
                    className="mt-1 text-2xl font-black tracking-tight"
                  >
                    {monthLabel(cursor.year, cursor.month)}
                  </motion.h3>
                </AnimatePresence>
                <p className="mt-1 text-xs text-white/75">
                  {selectedCountInMonth} active pin
                  {selectedCountInMonth === 1 ? "" : "s"} this month · window{" "}
                  {campaignStart} → {campaignEnd}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToCampaignStart}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur transition hover:bg-white/20"
                >
                  Campaign start
                </button>
                <div className="flex overflow-hidden rounded-full border border-white/20 bg-white/10 p-0.5 backdrop-blur">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => shiftMonth(-1)}
                    className="grid h-8 w-8 place-items-center rounded-full text-white transition hover:bg-white/20"
                  >
                    <ChevronRightIcon className="h-4 w-4 rotate-180" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => shiftMonth(1)}
                    className="grid h-8 w-8 place-items-center rounded-full text-white transition hover:bg-white/20"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-b border-[#E8F4F7] bg-[#F8FBFC] px-3 py-2 sm:px-4">
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-[#7A93A9]"
                >
                  {d}
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${cursor.year}-${cursor.month}`}
              initial={{ opacity: 0, x: direction >= 0 ? 24 : -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -24 : 24 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 grid grid-cols-7 grid-rows-6 gap-px bg-[#E8F4F7] p-px"
            >
              {cells.map((cell) => {
                const isSelected = selectedDate === cell.date;
                const activeEvents = cell.events.filter(
                  (e) => e.tile.isSelected && e.tile.isEnabled
                );
                const visible = cell.events.slice(0, 2);
                const overflow = cell.events.length - visible.length;

                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(cell.date);
                      const first =
                        activeEvents[0]?.tile ?? cell.events[0]?.tile;
                      if (first) onPreview(first.key);
                    }}
                    className={`group relative flex h-full min-h-0 flex-col items-stretch gap-1 overflow-hidden p-1.5 text-left transition sm:p-2 ${
                      cell.inMonth ? "bg-white" : "bg-[#F8FBFC]"
                    } ${
                      cell.inCampaign && cell.inMonth
                        ? "bg-gradient-to-b from-[#F0FAFC] to-white"
                        : ""
                    } ${
                      isSelected
                        ? "z-[1] ring-2 ring-inset ring-[#38B2D1]"
                        : "hover:bg-[#F0FAFC]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                          cell.isToday
                            ? "bg-[#38B2D1] text-white shadow-sm shadow-[#38B2D1]/40"
                            : cell.inMonth
                              ? "text-[#0B1F3D]"
                              : "text-[#A8BCCB]"
                        }`}
                      >
                        {cell.day}
                      </span>
                      {activeEvents.length > 0 ? (
                        <span className="hidden h-1.5 w-1.5 rounded-full bg-emerald-500 sm:inline-block" />
                      ) : null}
                    </div>

                    <div className="mt-auto space-y-0.5">
                      {visible.map((event) => {
                        const style = categoryStyle(event.tile.category);
                        const on =
                          event.tile.isSelected && event.tile.isEnabled;
                        return (
                          <span
                            key={`${event.tile.key}-${event.date}`}
                            className={`block truncate rounded-md px-1 py-0.5 text-[9px] font-bold leading-tight sm:text-[10px] ${
                              on
                                ? style.chip
                                : "bg-[#E8F4F7] text-[#557393] opacity-80"
                            }`}
                          >
                            {event.tile.name}
                          </span>
                        );
                      })}
                      {overflow > 0 ? (
                        <span className="block px-1 text-[9px] font-bold text-[#557393]">
                          +{overflow} more
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[#E8F4F7] bg-[#F8FBFC] px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A93A9]">
              Legend
            </span>
            {(
              [
                ["federal_holiday", "Holiday"],
                ["popular_greeting", "Greeting"],
                ["real_estate_milestone", "Real estate"],
                ["personal_milestone", "Personal"],
                ["custom", "Custom"],
              ] as const
            ).map(([key, label]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#557393]"
              >
                <span
                  className={`h-2 w-2 rounded-full ${categoryStyle(key).dot}`}
                />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex min-h-[720px] flex-col gap-3 xl:h-full xl:min-h-[760px]">
          <div className="flex min-h-0 flex-[0.9] flex-col overflow-hidden rounded-2xl border border-[#C4EBF2] bg-white p-4 shadow-sm">
            <div className="flex shrink-0 items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#38B2D1]">
                  Selected day
                </p>
                <p className="mt-1 text-lg font-black text-[#0B1F3D]">
                  {selectedDate
                    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        }
                      )
                    : "—"}
                </p>
              </div>
              <span className="rounded-full bg-[#F0FAFC] px-2.5 py-1 text-[11px] font-bold text-[#0B1F3D]">
                {selectedEvents.length} event
                {selectedEvents.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {selectedEvents.length ? (
                selectedEvents.map((event) => {
                  const style = categoryStyle(event.tile.category);
                  const Icon = occasionIcon(event.tile);
                  const checked =
                    event.tile.isSelected && event.tile.isEnabled;
                  const focused = previewKey === event.tile.key;
                  return (
                    <div
                      key={event.tile.key}
                      className={`flex items-center gap-2.5 rounded-2xl border px-2.5 py-2 transition ${
                        focused
                          ? "border-[#38B2D1] bg-[#F0FAFC] ring-1 ring-[#38B2D1]/20"
                          : "border-[#E8F4F7] bg-white hover:border-[#38B2D1]/40"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        onClick={() => onPreview(event.tile.key)}
                      >
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${style.iconWrap} ${style.icon}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-[#0B1F3D]">
                            {event.tile.name}
                          </span>
                          <span className="block truncate text-[11px] text-[#557393]">
                            {categoryLabel(event.tile.category)}
                            {event.dateRole === "observed" ? " · Observed" : ""}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={
                          checked
                            ? `Deselect ${event.tile.name}`
                            : `Select ${event.tile.name}`
                        }
                        onClick={() => {
                          onPreview(event.tile.key);
                          onToggle(event.tile);
                        }}
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition ${
                          checked
                            ? "border-[#38B2D1] bg-[#38B2D1] text-white"
                            : "border-[#C4EBF2] bg-white text-transparent hover:border-[#38B2D1]"
                        }`}
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[#C4EBF2] bg-[#F8FBFC] px-3 py-8 text-center text-xs text-[#557393]">
                  No fixed occasions on this day. Milestones still send per
                  customer dates.
                </div>
              )}
            </div>
          </div>

          <OccasionPreviewCard
            tile={previewTile}
            onEdit={onEdit}
            className="flex min-h-0 flex-[1.1] flex-col"
          />
        </div>
      </div>

      {milestoneTiles.length ? (
        <div className="overflow-hidden rounded-3xl border border-[#C4EBF2] bg-gradient-to-r from-[#FFF7ED] via-white to-[#F0FAFC] p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600">
                Per-customer milestones
              </p>
              <p className="mt-1 text-sm font-bold text-[#0B1F3D]">
                These follow each client’s own dates — not a single calendar day.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[#9A3412]">
              <GiftIcon className="h-4 w-4" />
              <HomeIcon className="h-4 w-4" />
              <SparklesIcon className="h-4 w-4 text-[#0E7490]" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {milestoneTiles.map((tile) => {
              const style = categoryStyle(tile.category);
              const Icon = occasionIcon(tile);
              const checked = tile.isSelected && tile.isEnabled;
              const focused = previewKey === tile.key;
              return (
                <div
                  key={tile.key}
                  className={`flex min-w-[220px] items-center gap-2.5 rounded-2xl border bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur transition ${
                    focused
                      ? "border-[#38B2D1] ring-1 ring-[#38B2D1]/25"
                      : "border-[#E8F4F7]"
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    onClick={() => onPreview(tile.key)}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${style.iconWrap} ${style.icon}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-[#0B1F3D]">
                        {tile.name}
                      </span>
                      <span className="block truncate text-[11px] text-[#557393]">
                        {tile.leadDays}d lead · {categoryLabel(tile.category)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={
                      checked ? `Deselect ${tile.name}` : `Select ${tile.name}`
                    }
                    onClick={() => {
                      onPreview(tile.key);
                      onToggle(tile);
                    }}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition ${
                      checked
                        ? "border-[#38B2D1] bg-[#38B2D1] text-white"
                        : "border-[#C4EBF2] bg-white text-transparent hover:border-[#38B2D1]"
                    }`}
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
