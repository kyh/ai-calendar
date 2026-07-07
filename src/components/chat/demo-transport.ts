import { StaticChatTransport } from "@loremllm/transport";
import { addDays, isBefore, set, startOfDay, startOfWeek } from "date-fns";

import type { ChatUIMessage } from "@/ai/messages/types";
import type { CalendarEvent, CalendarEventInput } from "@/lib/event";
import { toLocalIso } from "@/lib/date";

/**
 * Keyless demo mode: a client-side transport that replays one scripted
 * exchange ("Plan my Wednesday") instead of hitting /api/chat. It emits the
 * same part sequence the real agent produces — step-start, tool
 * input/output pairs, and matching `data-create-event` parts — so the
 * transcript UI and the onData -> store pipeline are exercised end to end.
 * Fixed event ids keep replays idempotent (upserts overwrite).
 */

interface DemoSeed {
  id: string;
  toolCallId: string;
  title: string;
  startHour: number;
  durationHours: number;
  description: string;
  color: CalendarEvent["color"];
}

const demoSeeds: DemoSeed[] = [
  {
    id: "demo-wednesday-1",
    toolCallId: "call_demo_0001",
    title: "Deep work: quarterly deck",
    startHour: 9,
    durationHours: 2,
    description: "Phone on silent — finish the draft before lunch",
    color: "blue",
  },
  {
    id: "demo-wednesday-2",
    toolCallId: "call_demo_0002",
    title: "Lunch with Sam",
    startHour: 12,
    durationHours: 1,
    description: "That ramen place on 5th",
    color: "green",
  },
  {
    id: "demo-wednesday-3",
    toolCallId: "call_demo_0003",
    title: "Inbox + planning wrap-up",
    startHour: 16,
    durationHours: 1,
    description: "Clear the inbox, lay out Thursday",
    color: "purple",
  },
];

/** This week's Wednesday, rolling to next week's if it's already past. */
const upcomingWednesday = (): Date => {
  const now = new Date();
  const wednesday = addDays(startOfWeek(now), 3);
  return isBefore(wednesday, startOfDay(now)) ? addDays(wednesday, 7) : wednesday;
};

const demoEvent = (seed: DemoSeed): { input: CalendarEventInput; event: CalendarEvent } => {
  const start = set(upcomingWednesday(), {
    hours: seed.startHour,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });
  const end = new Date(start.getTime() + seed.durationHours * 60 * 60 * 1000);
  const input: CalendarEventInput = {
    title: seed.title,
    start: toLocalIso(start),
    end: toLocalIso(end),
    allDay: false,
    description: seed.description,
    color: seed.color,
  };
  return { input, event: { ...input, id: seed.id } };
};

export const demoTransport = new StaticChatTransport<ChatUIMessage>({
  chunkDelayMs: [50, 200],
  async *mockResponse() {
    yield { type: "step-start" };

    for (const seed of demoSeeds) {
      const { input, event } = demoEvent(seed);
      yield {
        type: "tool-createEvent",
        toolName: "createEvent",
        toolCallId: seed.toolCallId,
        state: "input-available",
        input,
      };
      yield {
        type: "tool-createEvent",
        toolName: "createEvent",
        toolCallId: seed.toolCallId,
        state: "output-available",
        input,
        output: `Successfully created "${event.title}" (${event.start} – ${event.end}) with id ${event.id}.`,
      };
      yield {
        type: "data-create-event",
        id: seed.toolCallId,
        data: { event, status: "done" },
      };
    }

    yield {
      type: "text",
      text:
        "Wednesday is planned: a deep-work block at 9, lunch with Sam at noon, and an " +
        "inbox + planning wrap-up at 4pm. This is a scripted demo reply — add your own " +
        "Vercel AI Gateway key to plan for real.",
    };
  },
});
