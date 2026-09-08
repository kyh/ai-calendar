import assert from "node:assert/strict";
import { before, beforeEach, describe, test } from "node:test";

import type { CalendarEvent } from "@/lib/event";
import type * as EventStore from "@/lib/event-store";
import { seedEvents } from "@/lib/seed-events";

const STORAGE_KEY = "ai-calendar-events";

const createMemoryStorage = (): Storage => {
  const entries = new Map<string, string>();
  return {
    clear: () => {
      entries.clear();
    },
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()].at(index) ?? null,
    get length() {
      return entries.size;
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
};

let useEventStore: typeof EventStore.useEventStore;

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
  useEventStore.setState({ events: [], hasHydrated: false, seeded: false });
  if (stored === null) {
    globalThis.localStorage.removeItem(STORAGE_KEY);
  } else {
    globalThis.localStorage.setItem(STORAGE_KEY, stored);
  }
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
    for (const event of state().events) {
      state().deleteEvent(event.id);
    }
    assert.deepEqual(state().events, []);

    await reload();

    assert.deepEqual(state().events, []);
    assert.equal(state().seeded, true);
  });

  test("malformed stored events are dropped and the sound ones kept in start order", async () => {
    writeStored(
      JSON.stringify({
        state: {
          events: [
            {
              allDay: false,
              end: "2026-03-10T16:00:00",
              id: "later",
              start: "2026-03-10T15:00:00",
              title: "Later",
            },
            {
              allDay: false,
              end: "2026-03-10T10:00:00",
              id: "blank-title",
              start: "2026-03-10T09:00:00",
              title: "",
            },
            {
              allDay: false,
              end: "2026-03-10T10:00:00",
              id: "bad-start",
              start: "whenever",
              title: "Bad start",
            },
            {
              allDay: false,
              end: "2026-03-10T09:00:00",
              id: "earlier",
              start: "2026-03-10T08:00:00",
              title: "Earlier",
            },
            {
              end: "2026-03-10T12:00:00",
              id: "no-all-day",
              start: "2026-03-10T11:00:00",
              title: "Missing allDay",
            },
            null,
            "not an event",
          ],
          seeded: true,
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
          events: [
            {
              allDay: false,
              endsAt: "2026-03-10T10:00:00",
              id: "legacy",
              startsAt: "2026-03-10T09:00:00",
              title: "Legacy",
            },
          ],
          seeded: true,
        },
        version: 0,
      }),
    );

    await reload();

    assert.deepEqual(state().events, []);
    assert.equal(state().hasHydrated, true);
  });

  test("a persisted root of the wrong shape falls back to a fresh calendar", async () => {
    writeStored(JSON.stringify({ state: { events: "nope", seeded: true }, version: 0 }));

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
    writeStored(JSON.stringify({ state: { events: [], seeded: true }, version: 0 }));
    await reload();
  });

  test("addEvent assigns an id and keeps the list ordered by start", () => {
    const late = state().addEvent({
      allDay: false,
      end: "2026-03-10T16:00:00",
      start: "2026-03-10T15:00:00",
      title: "Late",
    });
    const early = state().addEvent({
      allDay: false,
      end: "2026-03-10T09:00:00",
      start: "2026-03-10T08:00:00",
      title: "Early",
    });

    assert.notEqual(late.id, early.id);
    assert.deepEqual(titles(state().events), ["Early", "Late"]);
  });

  test("updateEvent reports a missing id and re-sorts when the start moves", () => {
    const first = state().addEvent({
      allDay: false,
      end: "2026-03-10T10:00:00",
      start: "2026-03-10T09:00:00",
      title: "First",
    });
    state().addEvent({
      allDay: false,
      end: "2026-03-10T12:00:00",
      start: "2026-03-10T11:00:00",
      title: "Second",
    });

    assert.equal(state().updateEvent("nobody", { title: "Ghost" }), false);
    assert.equal(
      state().updateEvent(first.id, {
        end: "2026-03-10T14:00:00",
        start: "2026-03-10T13:00:00",
      }),
      true,
    );
    assert.deepEqual(titles(state().events), ["Second", "First"]);
  });

  test("deleteEvent reports whether the id existed", () => {
    const event = state().addEvent({
      allDay: false,
      end: "2026-03-10T10:00:00",
      start: "2026-03-10T09:00:00",
      title: "Doomed",
    });

    assert.equal(state().deleteEvent("nobody"), false);
    assert.equal(state().deleteEvent(event.id), true);
    assert.deepEqual(state().events, []);
  });

  test("upsertEvent replaces by id instead of duplicating", () => {
    const event: CalendarEvent = {
      allDay: false,
      end: "2026-03-10T10:00:00",
      id: "assistant-1",
      start: "2026-03-10T09:00:00",
      title: "From the assistant",
    };

    state().upsertEvent(event);
    state().upsertEvent({ ...event, title: "Renamed" });

    assert.deepEqual(titles(state().events), ["Renamed"]);
  });

  test("mutations survive a reload through storage", async () => {
    const event = state().addEvent({
      allDay: false,
      end: "2026-03-10T10:00:00",
      start: "2026-03-10T09:00:00",
      title: "Persisted",
    });

    await reload();

    assert.deepEqual(ids(state().events), [event.id]);
  });
});
