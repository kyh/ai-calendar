import { z } from "zod";

import { calendarEventPatchSchema, calendarEventSchema } from "@/lib/event";

/**
 * Client <-> server streaming contract. Agent tools write these payloads as
 * `data-*` UI-message parts; the client `onData` handler zod-parses them
 * before folding them into the event store — never trust the wire.
 *
 * Wire types carry a `data-` prefix ("data-create-event"); the `DataPart`
 * map keys do not.
 */

export const createEventDataSchema = z.object({
  event: calendarEventSchema,
});

export const updateEventDataSchema = z.object({
  id: z.string().min(1),
  patch: calendarEventPatchSchema,
});

export const deleteEventDataSchema = z.object({
  id: z.string().min(1),
});

export type DataPart = {
  "create-event": z.infer<typeof createEventDataSchema>;
  "update-event": z.infer<typeof updateEventDataSchema>;
  "delete-event": z.infer<typeof deleteEventDataSchema>;
};

/** Schemas keyed by (unprefixed) data part name, for validateUIMessages. */
export const dataPartSchemas: { [K in keyof DataPart]: z.ZodType<DataPart[K]> } = {
  "create-event": createEventDataSchema,
  "update-event": updateEventDataSchema,
  "delete-event": deleteEventDataSchema,
};
