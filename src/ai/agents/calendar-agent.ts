import { stepCountIs, tool, ToolLoopAgent } from "ai";
import { z } from "zod";

import { createModel } from "@/ai/gateway";
import type { ChatStreamWriter } from "@/ai/messages/types";
import type { CalendarContext } from "@/lib/calendar-context";
import { calendarEventInputSchema, calendarEventPatchSchema } from "@/lib/event";
import calendarPrompt from "./calendar-agent-prompt";

/**
 * Calendar agent: a ToolLoopAgent whose tools don't mutate anything
 * server-side — each tool validates its input, writes a `data-*` part into
 * the UI-message stream (the client folds it into the zustand store), and
 * returns a text ack for the model.
 */

interface WriterParams {
  writer: ChatStreamWriter;
}

const createCreateEventTool = ({ writer }: WriterParams) =>
  tool({
    description:
      "Create a calendar event. Takes the event WITHOUT an id (title, start, end, allDay, " +
      "optional description and color). Datetimes are ISO 8601 local datetimes without a " +
      "timezone suffix, e.g. 2026-07-09T15:00:00.",
    inputSchema: calendarEventInputSchema,
    execute: async (input, { toolCallId }) => {
      const event = { ...input, id: crypto.randomUUID() };
      writer.write({ id: toolCallId, type: "data-create-event", data: { event } });
      return `Successfully created "${event.title}" (${event.start} – ${event.end}) with id ${event.id}.`;
    },
  });

const createUpdateEventTool = ({ writer }: WriterParams) =>
  tool({
    description:
      "Update an existing calendar event. Takes the event id (from the schedule context) plus " +
      "a partial patch of fields to change (title, start, end, allDay, description, color). " +
      "Only include fields that change.",
    inputSchema: z.object({
      id: z.string().min(1).describe("Id of the event to update"),
      patch: calendarEventPatchSchema.describe("Fields to change"),
    }),
    execute: async (input, { toolCallId }) => {
      writer.write({ id: toolCallId, type: "data-update-event", data: input });
      return `Successfully updated event ${input.id}.`;
    },
  });

const createDeleteEventTool = ({ writer }: WriterParams) =>
  tool({
    description:
      "Delete a calendar event by id (from the schedule context). Destructive — only call " +
      "once the target event is unambiguous.",
    inputSchema: z.object({
      id: z.string().min(1).describe("Id of the event to delete"),
    }),
    execute: async (input, { toolCallId }) => {
      writer.write({ id: toolCallId, type: "data-delete-event", data: input });
      return `Successfully deleted event ${input.id}.`;
    },
  });

/** Appends the per-turn schedule context to the static system prompt. */
const buildCalendarInstructions = (context: CalendarContext): string =>
  [
    calendarPrompt,
    `## Current context

- Current datetime: ${context.now} (local: ${context.localNow})
- User timezone: ${context.timeZone}

## Current schedule (events as JSON)

${JSON.stringify(context.events)}`,
  ].join("\n\n");

interface CreateCalendarAgentParams {
  apiKey: string;
  writer: ChatStreamWriter;
  calendarContext: CalendarContext;
}

export function createCalendarAgent({
  apiKey,
  writer,
  calendarContext,
}: CreateCalendarAgentParams) {
  return new ToolLoopAgent({
    model: createModel(apiKey),
    instructions: buildCalendarInstructions(calendarContext),
    tools: {
      createEvent: createCreateEventTool({ writer }),
      updateEvent: createUpdateEventTool({ writer }),
      deleteEvent: createDeleteEventTool({ writer }),
    },
    toolChoice: "auto",
    stopWhen: stepCountIs(5),
  });
}
