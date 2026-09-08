import { defineTool } from "eve/tools";

import { deleteEventInputSchema, deleteEventPayloadSchema } from "../../src/lib/assistant-schemas";

export default defineTool({
  description:
    "Delete a calendar event by id (use the exact id from the schedule context). Destructive — only call once the target event is unambiguous.",
  // Stateless: the client owns the events and no-ops on unknown ids.
  execute: (input) => input,
  inputSchema: deleteEventInputSchema,
  outputSchema: deleteEventPayloadSchema,
  toModelOutput: (output) => ({
    type: "text",
    value: `Successfully deleted event ${output.id}.`,
  }),
});
