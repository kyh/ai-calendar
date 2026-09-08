import { z } from "zod";

import { calendarEventSchema } from "@/lib/event";
import type { CalendarEvent } from "@/lib/event";

/**
 * Per-turn schedule context the client ships in the chat request body.
 * The server is stateless: it appends this to the agent's instructions so
 * the model can answer schedule questions and target real event ids
 * without a read tool.
 */

export const calendarContextSchema = z.object({
  /** Events within the context window, sorted by start. */
  events: z.array(calendarEventSchema),
  /** Human-readable local datetime including the weekday. */
  localNow: z.string(),
  /** Current datetime, ISO 8601 with UTC instant. */
  now: z.string(),
  /** IANA timezone, e.g. "America/Los_Angeles". */
  timeZone: z.string(),
});

export type CalendarContext = z.infer<typeof calendarContextSchema>;

const CONTEXT_WINDOW_DAYS = 45;
const CONTEXT_MAX_EVENTS = 300;

/** Builds the context from the current store snapshot (client-side). */
export const buildCalendarContext = (events: readonly CalendarEvent[]): CalendarContext => {
  const now = new Date();
  const windowMs = CONTEXT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() - windowMs);
  const to = new Date(now.getTime() + windowMs);
  return {
    events: events
      .filter((event) => {
        const start = new Date(event.start);
        return start >= from && start <= to;
      })
      .slice(0, CONTEXT_MAX_EVENTS),
    localNow: now.toLocaleString("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "long",
      weekday: "long",
      year: "numeric",
    }),
    now: now.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
};
