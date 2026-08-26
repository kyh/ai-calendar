import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { format, parseISO } from "date-fns";

import {
  eventsOnDay,
  formatEventTime,
  formatRangeLabel,
  layoutDayEvents,
  monthGridDays,
  toLocalIso,
  weekDays,
  type PositionedEvent,
} from "@/lib/date";
import type { CalendarEvent } from "@/lib/event";

/** DST assertions need a fixed zone; the runner otherwise inherits the machine's. */
process.env.TZ = "America/New_York";

const SPRING_FORWARD = new Date(2026, 2, 8);
const FALL_BACK = new Date(2026, 10, 1);

const timed = (id: string, start: string, end: string): CalendarEvent => ({
  id,
  title: id,
  start,
  end,
  allDay: false,
});

const allDay = (id: string, start: string, end: string): CalendarEvent => ({
  id,
  title: id,
  start,
  end,
  allDay: true,
});

const ymd = (date: Date): string => format(date, "yyyy-MM-dd");

const ids = (events: readonly CalendarEvent[]): string[] => events.map((event) => event.id);

const blocks = (positioned: readonly PositionedEvent[]) =>
  positioned.map(({ event, startMinutes, durationMinutes, lane, laneCount }) => ({
    id: event.id,
    startMinutes,
    durationMinutes,
    lane,
    laneCount,
  }));

describe("monthGridDays", () => {
  test("a month that already fills whole weeks gets no padding", () => {
    const grid = monthGridDays(new Date(2026, 1, 15));

    assert.equal(grid.length, 28);
    assert.equal(ymd(grid[0]), "2026-02-01");
    assert.equal(ymd(grid[27]), "2026-02-28");
  });

  test("a month spilling over six weeks pads both ends", () => {
    const grid = monthGridDays(new Date(2026, 4, 15));

    assert.equal(grid.length, 42);
    assert.equal(ymd(grid[0]), "2026-04-26");
    assert.equal(ymd(grid[41]), "2026-06-06");
  });

  test("every cell is a distinct local midnight across a DST transition", () => {
    const grid = monthGridDays(SPRING_FORWARD);

    assert.equal(grid.length, 35);
    assert.equal(new Set(grid.map(ymd)).size, 35);
    assert.ok(grid.every((day) => day.getHours() === 0 && day.getMinutes() === 0));
  });
});

describe("weekDays", () => {
  test("returns seven midnights from Sunday, DST week included", () => {
    const week = weekDays(new Date(2026, 2, 10));

    assert.deepEqual(week.map(ymd), [
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
      "2026-03-12",
      "2026-03-13",
      "2026-03-14",
    ]);
    assert.ok(week.every((day) => day.getHours() === 0));
  });
});

describe("eventsOnDay", () => {
  const overnight = timed("overnight", "2026-03-09T22:00:00", "2026-03-11T02:00:00");

  test("a multi-day event appears on every day it spans and no others", () => {
    const days = [8, 9, 10, 11, 12].map((day) => new Date(2026, 2, day));

    assert.deepEqual(
      days.map((day) => ids(eventsOnDay([overnight], day))),
      [[], ["overnight"], ["overnight"], ["overnight"], []],
    );
  });

  test("an event ending exactly at midnight stays on the day it started", () => {
    const untilMidnight = timed("late", "2026-03-09T23:00:00", "2026-03-10T00:00:00");

    assert.deepEqual(ids(eventsOnDay([untilMidnight], new Date(2026, 2, 9))), ["late"]);
    assert.deepEqual(ids(eventsOnDay([untilMidnight], new Date(2026, 2, 10))), []);
  });

  test("a zero-length event at midnight belongs to the day it opens", () => {
    const instant = timed("instant", "2026-03-10T00:00:00", "2026-03-10T00:00:00");

    assert.deepEqual(ids(eventsOnDay([instant], new Date(2026, 2, 10))), ["instant"]);
    assert.deepEqual(ids(eventsOnDay([instant], new Date(2026, 2, 9))), []);
  });
});

describe("layoutDayEvents", () => {
  test("positions blocks by wall clock, not elapsed time, on DST days", () => {
    const springForward = layoutDayEvents(
      [timed("a", "2026-03-08T09:00:00", "2026-03-08T10:00:00")],
      SPRING_FORWARD,
    );
    const fallBack = layoutDayEvents(
      [timed("a", "2026-11-01T09:00:00", "2026-11-01T10:00:00")],
      FALL_BACK,
    );

    assert.deepEqual(blocks(springForward), [
      { id: "a", startMinutes: 540, durationMinutes: 60, lane: 0, laneCount: 1 },
    ]);
    assert.deepEqual(blocks(fallBack), [
      { id: "a", startMinutes: 540, durationMinutes: 60, lane: 0, laneCount: 1 },
    ]);
  });

  test("transitively overlapping events share one cluster width", () => {
    const day = new Date(2026, 2, 10);
    const positioned = layoutDayEvents(
      [
        timed("a", "2026-03-10T09:00:00", "2026-03-10T10:00:00"),
        timed("b", "2026-03-10T09:30:00", "2026-03-10T10:30:00"),
        timed("c", "2026-03-10T10:15:00", "2026-03-10T11:00:00"),
        timed("solo", "2026-03-10T12:00:00", "2026-03-10T13:00:00"),
      ],
      day,
    );

    assert.deepEqual(blocks(positioned), [
      { id: "a", startMinutes: 540, durationMinutes: 60, lane: 0, laneCount: 2 },
      { id: "b", startMinutes: 570, durationMinutes: 60, lane: 1, laneCount: 2 },
      { id: "c", startMinutes: 615, durationMinutes: 45, lane: 0, laneCount: 2 },
      { id: "solo", startMinutes: 720, durationMinutes: 60, lane: 0, laneCount: 1 },
    ]);
  });

  test("the longest event of a shared start takes the first lane, nested events reuse a free one", () => {
    const day = new Date(2026, 2, 10);
    const positioned = layoutDayEvents(
      [
        timed("inner", "2026-03-10T10:00:00", "2026-03-10T11:00:00"),
        timed("twin", "2026-03-10T09:00:00", "2026-03-10T10:00:00"),
        timed("outer", "2026-03-10T09:00:00", "2026-03-10T12:00:00"),
      ],
      day,
    );

    assert.deepEqual(blocks(positioned), [
      { id: "outer", startMinutes: 540, durationMinutes: 180, lane: 0, laneCount: 2 },
      { id: "twin", startMinutes: 540, durationMinutes: 60, lane: 1, laneCount: 2 },
      { id: "inner", startMinutes: 600, durationMinutes: 60, lane: 1, laneCount: 2 },
    ]);
  });

  test("back-to-back events are separate clusters at full width", () => {
    const positioned = layoutDayEvents(
      [
        timed("first", "2026-03-10T09:00:00", "2026-03-10T10:00:00"),
        timed("second", "2026-03-10T10:00:00", "2026-03-10T11:00:00"),
      ],
      new Date(2026, 2, 10),
    );

    assert.deepEqual(blocks(positioned), [
      { id: "first", startMinutes: 540, durationMinutes: 60, lane: 0, laneCount: 1 },
      { id: "second", startMinutes: 600, durationMinutes: 60, lane: 0, laneCount: 1 },
    ]);
  });

  test("blocks are clamped to the day and to a clickable 30 minutes", () => {
    const overnight = timed("overnight", "2026-03-09T22:00:00", "2026-03-10T02:00:00");
    const sliver = timed("sliver", "2026-03-10T09:00:00", "2026-03-10T09:05:00");

    assert.deepEqual(blocks(layoutDayEvents([overnight], new Date(2026, 2, 9))), [
      { id: "overnight", startMinutes: 1320, durationMinutes: 120, lane: 0, laneCount: 1 },
    ]);
    assert.deepEqual(blocks(layoutDayEvents([overnight], new Date(2026, 2, 10))), [
      { id: "overnight", startMinutes: 0, durationMinutes: 120, lane: 0, laneCount: 1 },
    ]);
    assert.deepEqual(blocks(layoutDayEvents([sliver], new Date(2026, 2, 10))), [
      { id: "sliver", startMinutes: 540, durationMinutes: 30, lane: 0, laneCount: 1 },
    ]);
  });

  test("all-day events are left to the all-day row", () => {
    const positioned = layoutDayEvents(
      [
        allDay("holiday", "2026-03-10T00:00:00", "2026-03-11T00:00:00"),
        timed("meeting", "2026-03-10T09:00:00", "2026-03-10T10:00:00"),
      ],
      new Date(2026, 2, 10),
    );

    assert.deepEqual(ids(positioned.map((item) => item.event)), ["meeting"]);
  });
});

describe("labels", () => {
  test("a week label collapses a shared month and expands across a boundary", () => {
    assert.equal(formatRangeLabel(new Date(2026, 2, 4), "month"), "March 2026");
    assert.equal(formatRangeLabel(new Date(2026, 2, 4), "week"), "Mar 1 – 7, 2026");
    assert.equal(formatRangeLabel(new Date(2026, 2, 31), "week"), "Mar 29 – Apr 4, 2026");
  });

  test("event times drop the minutes only on the hour", () => {
    assert.equal(formatEventTime("2026-11-01T09:00:00"), "9AM");
    assert.equal(formatEventTime("2026-11-01T09:30:00"), "9:30AM");
  });
});

describe("toLocalIso", () => {
  test("serializes wall-clock time with no zone suffix and round-trips through parseISO", () => {
    const onDstDay = new Date(2026, 10, 1, 9, 30, 0);
    const serialized = toLocalIso(onDstDay);

    assert.equal(serialized, "2026-11-01T09:30:00");
    assert.equal(parseISO(serialized).getTime(), onDstDay.getTime());
  });
});
