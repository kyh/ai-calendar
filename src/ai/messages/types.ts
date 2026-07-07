import type { UIMessage, UIMessageStreamWriter } from "ai";

import type { CalendarEventInput, CalendarEventPatch } from "@/lib/event";
import type { DataPart } from "./data-parts";
import type { Metadata } from "./metadata";

/**
 * UI tool typings for the calendar agent's tool set — lets the chat
 * transcript narrow `tool-*` message parts without casts.
 */
export type CalendarTools = {
  createEvent: { input: CalendarEventInput; output: string };
  updateEvent: { input: { id: string; patch: CalendarEventPatch }; output: string };
  deleteEvent: { input: { id: string }; output: string };
};

export type ChatUIMessage = UIMessage<Metadata, DataPart, CalendarTools>;

export type CalendarStreamWriter = UIMessageStreamWriter<ChatUIMessage>;
