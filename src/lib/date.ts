import {
  addDays,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { CalendarEvent } from "@/lib/event";

/** Serializes a Date as a local ISO datetime (no timezone suffix). */
export const toLocalIso = (date: Date): string => format(date, "yyyy-MM-dd'T'HH:mm:ss");

/** All days shown in a month grid: full weeks covering the month. */
export const monthGridDays = (focus: Date): Date[] =>
  eachDayOfInterval({
    start: startOfWeek(startOfMonth(focus)),
    end: endOfWeek(endOfMonth(focus)),
  });

/** The 7 days of the week containing `focus`. */
export const weekDays = (focus: Date): Date[] => {
  const start = startOfWeek(focus);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
};

/** Events that touch `day` (multi-day events appear on every day they span). */
export const eventsOnDay = (events: readonly CalendarEvent[], day: Date): CalendarEvent[] => {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  return events.filter((event) => {
    const start = parseISO(event.start);
    const end = parseISO(event.end);
    return start < dayEnd && (end > dayStart || isSameDay(start, day));
  });
};

export interface PositionedEvent {
  event: CalendarEvent;
  /** Minutes from midnight where the block starts (clamped to the day). */
  startMinutes: number;
  /** Block duration in minutes (clamped to the day, min 30 for clickability). */
  durationMinutes: number;
  /** Horizontal lane within its overlap cluster. */
  lane: number;
  /** Total lanes in the overlap cluster. */
  laneCount: number;
}

/**
 * Lays out one day's timed events into overlap lanes for the week view.
 * Greedy interval-partitioning: sort by start, place each event in the
 * first lane that is free; events sharing a cluster split the width.
 */
export const layoutDayEvents = (events: readonly CalendarEvent[], day: Date): PositionedEvent[] => {
  const dayStart = startOfDay(day);
  const timed = eventsOnDay(events, day)
    .filter((event) => !event.allDay)
    .map((event) => {
      const start = parseISO(event.start);
      const end = parseISO(event.end);
      const startMinutes = Math.max(0, differenceInMinutes(start, dayStart));
      const endMinutes = Math.min(
        24 * 60,
        Math.max(differenceInMinutes(end, dayStart), startMinutes + 30),
      );
      return { event, startMinutes, endMinutes };
    })
    .toSorted((a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes);

  const laneEnds: number[] = [];
  const placed = timed.map((item) => {
    let lane = laneEnds.findIndex((endsAt) => endsAt <= item.startMinutes);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMinutes);
    } else {
      laneEnds[lane] = item.endMinutes;
    }
    return {
      event: item.event,
      startMinutes: item.startMinutes,
      endMinutes: item.endMinutes,
      lane,
    };
  });

  // Cluster = maximal run of transitively-overlapping events; every event in
  // a cluster shares the cluster's max lane count so widths line up.
  const results: PositionedEvent[] = [];
  let cluster: typeof placed = [];
  let clusterEnd = -1;
  const flush = () => {
    const laneCount = Math.max(1, ...cluster.map((item) => item.lane + 1));
    for (const item of cluster) {
      results.push({
        event: item.event,
        startMinutes: item.startMinutes,
        durationMinutes: item.endMinutes - item.startMinutes,
        lane: item.lane,
        laneCount,
      });
    }
    cluster = [];
  };
  for (const item of placed) {
    if (cluster.length > 0 && item.startMinutes >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMinutes);
  }
  if (cluster.length > 0) flush();
  return results;
};

export const formatEventTime = (iso: string): string => {
  const date = parseISO(iso);
  return date.getMinutes() === 0 ? format(date, "ha") : format(date, "h:mma");
};

export const formatRangeLabel = (focus: Date, view: "month" | "week"): string => {
  if (view === "month") return format(focus, "MMMM yyyy");
  const days = weekDays(focus);
  const first = days[0];
  const last = days[6];
  if (first === undefined || last === undefined) return format(focus, "MMMM yyyy");
  return first.getMonth() === last.getMonth()
    ? `${format(first, "MMM d")} – ${format(last, "d, yyyy")}`
    : `${format(first, "MMM d")} – ${format(last, "MMM d, yyyy")}`;
};
