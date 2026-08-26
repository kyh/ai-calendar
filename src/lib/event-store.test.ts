import assert from "node:assert/strict";
import { before, beforeEach, describe, test } from "node:test";

import type { CalendarEvent } from "@/lib/event";
import { seedEvents } from "@/lib/seed-events";

const STORAGE_KEY = "ai-calendar-events";

const createMemoryStorage = (): Storage => {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => {
      entries.clear();
    },
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => Array.from(entries.keys()).at(index) ?? null,
    removeItem: (key: string) => {
      entries.delete(key);
    },
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
};

let useEventStore: typeof import("@/lib/event-store").useEventStore;

/** The store builds its persist storage at import, so localStorage must exist first. */
before(async () => {
  globalThis.localStorage = createMemoryStorage();
  ({ useEventStore } = await import("@/lib/event-store"));
});

const state = () => useEventStore.getState();

const ids = (events: readonly CalendarEvent[]): string[] => events.map((event) => event.id);

const titles = (events: readonly CalendarEvent[]): string[] => events.map((event) => event.title);

const writeStored = (payload: string): void => {
  globalThis.localStorage.setItem(STORAGE_KEY, payload);
};

/**
 * A page reload: in-memory state is dropped and only storage survives. The
 * payload is snapshotted and put back because resetting the store persists too.
 */
const reload = async (): Promise<void> => {
  const stored = globalThis.localStorage.getItem(STORAGE_KEY);
  useEventStore.setState({ events: [], seeded: false, hasHydrated: false });
  if (stored === null) globalThis.localStorage.removeItem(STORAGE_KEY);
  else globalThis.localStorage.setItem(STORAGE_KEY, stored);
  await useEventStore.persist.rehydrate();
};

describe("rehydration", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  test("an empty store seeds a starter calendar and persists it", async () => {
    await reload();

    assert.deepEqual(ids(state().events), ids(seedEvents()));
    assert.equal(state().seeded, true);
    assert.equal(state().hasHydrated, true);
    assert.notEqual(globalThis.localStorage.getItem(STORAGE_KEY), null);
  });

  test("the seed runs once, so a cleared calendar stays cleared", async () => {
    await reload();
    for (const event of state().events) state().deleteEvent(event.id);
    assert.deepEqual(state().events, []);

    await reload();

    assert.deepEqual(state().events, []);
    assert.equal(state().seeded, true);
  });

  test("malformed stored events are dropped and the sound ones kept in start order", async () => {
    writeStored(
      JSON.stringify({
        state: {
          seeded: true,
          events: [
            {
              id: "later",
              title: "Later",
              start: "2026-03-10T15:00:00",
              end: "2026-03-10T16:00:00",
              allDay: false,
            },
            {
              id: "blank-title",
              title: "",
              start: "2026-03-10T09:00:00",
              end: "2026-03-10T10:00:00",
              allDay: false,
            },
            {
              id: "bad-start",
              title: "Bad start",
              start: "whenever",
              end: "2026-03-10T10:00:00",
              allDay: false,
            },
            {
              id: "earlier",
              title: "Earlier",
              start: "2026-03-10T08:00:00",
              end: "2026-03-10T09:00:00",
              allDay: false,
            },
            {
              id: "no-all-day",
              title: "Missing allDay",
              start: "2026-03-10T11:00:00",
              end: "2026-03-10T12:00:00",
            },
            null,
            "not an event",
          ],
        },
        version: 0,
      }),
    );

    await reload();

    assert.deepEqual(ids(state().events), ["earlier", "later"]);
    assert.equal(state().seeded, true);
  });

  test("events from an older field shape are dropped, not half-restored", async () => {
    writeStored(
      JSON.stringify({
        state: {
          seeded: true,
          events: [
            {
              id: "legacy",
              title: "Legacy",
              startsAt: "2026-03-10T09:00:00",
              endsAt: "2026-03-10T10:00:00",
              allDay: false,
            },
          ],
        },
        version: 0,
      }),
    );

    await reload();

    assert.deepEqual(state().events, []);
    assert.equal(state().hasHydrated, true);
  });

  test("a persisted root of the wrong shape falls back to a fresh calendar", async () => {
    writeStored(JSON.stringify({ state: { seeded: true, events: "nope" }, version: 0 }));

    await reload();

    assert.deepEqual(ids(state().events), ids(seedEvents()));
    assert.equal(state().hasHydrated, true);
  });

  test("an unparseable payload boots the calendar instead of throwing", async () => {
    writeStored("{ this is not json");

    await reload();

    assert.deepEqual(ids(state().events), ids(seedEvents()));
    assert.equal(state().hasHydrated, true);
  });
});

describe("mutations", () => {
  beforeEach(async () => {
    globalThis.localStorage.clear();
    writeStored(JSON.stringify({ state: { seeded: true, events: [] }, version: 0 }));
    await reload();
  });

  test("addEvent assigns an id and keeps the list ordered by start", () => {
    const late = state().addEvent({
      title: "Late",
      start: "2026-03-10T15:00:00",
      end: "2026-03-10T16:00:00",
      allDay: false,
    });
    const early = state().addEvent({
      title: "Early",
      start: "2026-03-10T08:00:00",
      end: "2026-03-10T09:00:00",
      allDay: false,
    });

    assert.notEqual(late.id, early.id);
    assert.deepEqual(titles(state().events), ["Early", "Late"]);
  });

  test("updateEvent reports a missing id and re-sorts when the start moves", () => {
    const first = state().addEvent({
      title: "First",
      start: "2026-03-10T09:00:00",
      end: "2026-03-10T10:00:00",
      allDay: false,
    });
    state().addEvent({
      title: "Second",
      start: "2026-03-10T11:00:00",
      end: "2026-03-10T12:00:00",
      allDay: false,
    });

    assert.equal(state().updateEvent("nobody", { title: "Ghost" }), false);
    assert.equal(
      state().updateEvent(first.id, {
        start: "2026-03-10T13:00:00",
        end: "2026-03-10T14:00:00",
      }),
      true,
    );
    assert.deepEqual(titles(state().events), ["Second", "First"]);
  });

  test("deleteEvent reports whether the id existed", () => {
    const event = state().addEvent({
      title: "Doomed",
      start: "2026-03-10T09:00:00",
      end: "2026-03-10T10:00:00",
      allDay: false,
    });

    assert.equal(state().deleteEvent("nobody"), false);
    assert.equal(state().deleteEvent(event.id), true);
    assert.deepEqual(state().events, []);
  });

  test("upsertEvent replaces by id instead of duplicating", () => {
    const event: CalendarEvent = {
      id: "assistant-1",
      title: "From the assistant",
      start: "2026-03-10T09:00:00",
      end: "2026-03-10T10:00:00",
      allDay: false,
    };

    state().upsertEvent(event);
    state().upsertEvent({ ...event, title: "Renamed" });

    assert.deepEqual(titles(state().events), ["Renamed"]);
  });

  test("mutations survive a reload through storage", async () => {
    const event = state().addEvent({
      title: "Persisted",
      start: "2026-03-10T09:00:00",
      end: "2026-03-10T10:00:00",
      allDay: false,
    });

    await reload();

    assert.deepEqual(ids(state().events), [event.id]);
  });
});
