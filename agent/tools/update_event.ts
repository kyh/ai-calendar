import { defineTool } from "eve/tools";

import { updateEventInputSchema, updateEventPayloadSchema } from "../../src/lib/assistant-schemas";

export default defineTool({
  description:
    "Update an existing calendar event. Takes the event id (use the exact id from the schedule context) plus a partial patch of fields to change (title, start, end, allDay, description, color). Only include fields that change.",
  inputSchema: updateEventInputSchema,
  outputSchema: updateEventPayloadSchema,
  // The tool is stateless: the client owns the events and validates the id
  // when it applies the patch (unknown ids surface as an error toast there).
  execute: (input) => input,
  toModelOutput: (output) => {
    const changed = Object.keys(output.patch).join(", ");
    return {
      type: "text",
      value: `Successfully updated ${changed || "nothing"} on event ${output.id}.`,
    };
  },
});
