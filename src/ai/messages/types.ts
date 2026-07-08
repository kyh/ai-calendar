import type { UIMessage, UIMessageStreamWriter } from "ai";

import type { DataPart } from "@/ai/messages/data-parts";
import type { CalendarEventInput, CalendarEventPatch } from "@/lib/event";

/**
 * UI tool typings for the agent's tool set — lets the chat transcript
 * narrow `tool-*` message parts without casts.
 */
export type ChatTools = {
  createEvent: { input: CalendarEventInput; output: string };
  updateEvent: { input: { id: string; patch: CalendarEventPatch }; output: string };
  deleteEvent: { input: { id: string }; output: string };
};

export type ChatUIMessage = UIMessage<unknown, DataPart, ChatTools>;

export type ChatStreamWriter = UIMessageStreamWriter<ChatUIMessage>;
