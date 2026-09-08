import { z } from "zod";

/**
 * Single source of truth for the calendar event shape. Imported by the UI,
 * the zustand event store, the client<->server data-parts contract
 * (`src/ai/messages/data-parts.ts`), and the calendar-agent tools, so the
 * model and the client can never disagree about what an event looks like.
 */

export const eventColors = ["default", "blue", "green", "red", "amber", "purple"] as const;

export const eventColorSchema = z.enum(eventColors);

export type EventColor = z.infer<typeof eventColorSchema>;

const isoDateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "must be an ISO 8601 datetime string",
});

export const calendarEventSchema = z.object({
  allDay: z.boolean(),
  color: eventColorSchema.optional(),
  description: z.string().optional(),
  /** ISO 8601 datetime; must be at or after `start`. */
  end: isoDateTime,
  id: z.string().min(1),
  /** ISO 8601 datetime, e.g. "2026-07-07T12:00:00" (local time). */
  start: isoDateTime,
  title: z.string().min(1),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

/** Input for creating an event — everything except the generated id. */
export const calendarEventInputSchema = calendarEventSchema.omit({ id: true });

export type CalendarEventInput = z.infer<typeof calendarEventInputSchema>;

/** Partial patch applied to an existing event. */
export const calendarEventPatchSchema = calendarEventInputSchema.partial();

export type CalendarEventPatch = z.infer<typeof calendarEventPatchSchema>;
