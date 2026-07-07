import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from "ai";

import { createCalendarAgent } from "@/ai/agents/calendar-agent";
import type { ChatUIMessage } from "@/ai/messages/types";
import type { CalendarContext } from "@/lib/calendar-context";

/**
 * Opens a UI-message stream, runs the calendar agent over the conversation,
 * and merges the agent's output (text + tool `data-*` parts) back into the
 * same stream. The per-turn calendar context is appended to the agent's
 * instructions server-side; the server keeps no state.
 */
export const streamChatResponse = (
  messages: ChatUIMessage[],
  apiKey: string,
  calendarContext: CalendarContext,
) =>
  createUIMessageStreamResponse({
    stream: createUIMessageStream<ChatUIMessage>({
      originalMessages: messages,
      execute: async ({ writer }) => {
        const agent = createCalendarAgent({ apiKey, writer, calendarContext });
        const result = await agent.stream({
          messages: await convertToModelMessages(messages),
        });
        void result.consumeStream();
        writer.merge(result.toUIMessageStream({ sendReasoning: true }));
      },
    }),
  });
