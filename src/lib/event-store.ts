"use client";

import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  calendarEventSchema,
  type CalendarEvent,
  type CalendarEventInput,
  type CalendarEventPatch,
} from "@/lib/event";
import { seedEvents } from "@/lib/seed-events";

interface EventStoreState {
  events: CalendarEvent[];
  hasHydrated: boolean;
  /** Whether the one-time seed has run — prevents seeds resurrecting after a full clear. */
  seeded: boolean;
  addEvent: (input: CalendarEventInput) => CalendarEvent;
  /** Idempotent insert of a fully-formed event (used by the AI bridge). */
  upsertEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, patch: CalendarEventPatch) => boolean;
  deleteEvent: (id: string) => boolean;
  seed: () => void;
  setHasHydrated: (value: boolean) => void;
}

const sortByStart = (events: CalendarEvent[]): CalendarEvent[] =>
  events.toSorted((a, b) => a.start.localeCompare(b.start));

/**
 * localStorage boundary: every persisted event is zod-parsed on read and any
 * malformed entry is dropped, so corrupt/tampered/forked storage can't crash
 * downstream consumers (e.g. month-view's `.localeCompare` on a bad `start`).
 */
const persistedStateSchema = z.object({
  events: z.array(z.unknown()).transform((events) =>
    events.flatMap((event) => {
      const parsed = calendarEventSchema.safeParse(event);
      return parsed.success ? [parsed.data] : [];
    }),
  ),
  seeded: z.boolean().optional(),
});

export const useEventStore = create<EventStoreState>()(
  persist(
    (set, get) => ({
      events: [],
      hasHydrated: false,
      seeded: false,
      addEvent: (input) => {
        const event: CalendarEvent = { ...input, id: crypto.randomUUID() };
        set((state) => ({ events: sortByStart([...state.events, event]) }));
        return event;
      },
      upsertEvent: (event) => {
        set((state) => ({
          events: sortByStart([
            ...state.events.filter((existing) => existing.id !== event.id),
            event,
          ]),
        }));
      },
      updateEvent: (id, patch) => {
        if (!get().events.some((event) => event.id === id)) return false;
        set((state) => ({
          events: sortByStart(
            state.events.map((event) => (event.id === id ? { ...event, ...patch } : event)),
          ),
        }));
        return true;
      },
      deleteEvent: (id) => {
        if (!get().events.some((event) => event.id === id)) return false;
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        }));
        return true;
      },
      seed: () =>
        set((state) => ({
          events: sortByStart([
            ...state.events,
            ...seedEvents().filter((seed) => !state.events.some((e) => e.id === seed.id)),
          ]),
          seeded: true,
        })),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "ai-calendar-events",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ events: state.events, seeded: state.seeded }),
      merge: (persisted, current) => {
        const parsed = persistedStateSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return {
          ...current,
          events: sortByStart(parsed.data.events),
          seeded: parsed.data.seeded ?? false,
        };
      },
      // An unreadable payload calls back with no state; falling back to the
      // pre-hydration store boots a seeded calendar instead of spinning forever.
      onRehydrateStorage: (initial) => (state) => {
        const store = state ?? initial;
        if (!store.seeded) store.seed();
        store.setHasHydrated(true);
      },
    },
  ),
);
