import { defineTool } from "eve/tools";

// Relative import: agent/ is compiled by eve, which resolves plain relative
// paths but not tsconfig `@/*` aliases. Domain schemas stay in src/lib.
import { createEventInputSchema, createEventPayloadSchema } from "../../src/lib/assistant-schemas";

export default defineTool({
  description:
    "Create a calendar event. Takes the event WITHOUT an id (title, start, end, allDay, optional description and color). Datetimes are ISO 8601 local datetimes without a timezone suffix, e.g. 2026-07-09T15:00:00.",
  inputSchema: createEventInputSchema,
  outputSchema: createEventPayloadSchema,
  execute: (input) => ({
    event: { ...input, id: crypto.randomUUID() },
  }),
  // The client applies the full event from `action.result`; the model only
  // needs a short ack (with the id so it can reference the event later).
  toModelOutput: (output) => ({
    type: "text",
    value: `Successfully created "${output.event.title}" (${output.event.start} – ${output.event.end}) with id ${output.event.id}.`,
  }),
});
