import { z } from "zod";

// Relative (not `@/`) so eve's compiler can bundle this module for agent
// tools — eve does not read tsconfig path aliases.
import { calendarEventPatchSchema, calendarEventSchema } from "./event";

// -----------------------------------------------------------------------------
// The client<->agent contract, shared by both sides:
// - `agent/tools/*.ts` use the input schemas as `inputSchema` and the payload
//   schemas as `outputSchema` (what `execute` returns).
// - The chat panel zod-parses every `action.result` tool output against the
//   payload schemas before touching the zustand store.
// -----------------------------------------------------------------------------

export { calendarEventInputSchema as createEventInputSchema } from "./event";

export const updateEventInputSchema = z.object({
  id: z.string().min(1).describe("Id of the event to update"),
  patch: calendarEventPatchSchema.describe("Fields to change"),
});

export const deleteEventInputSchema = z.object({
  id: z.string().min(1).describe("Id of the event to delete"),
});

/** `create_event` tool output: the fully-formed event (the id is server-generated). */
export const createEventPayloadSchema = z.object({ event: calendarEventSchema });
/** `update_event` tool output: the applied patch, echoed back. */
export const updateEventPayloadSchema = updateEventInputSchema;
/** `delete_event` tool output: the deleted event's id, echoed back. */
export const deleteEventPayloadSchema = deleteEventInputSchema;
