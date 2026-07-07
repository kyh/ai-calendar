import { validateUIMessages } from "ai";
import { z } from "zod";

import {
  createEventDataSchema,
  deleteEventDataSchema,
  updateEventDataSchema,
} from "@/ai/messages/data-parts";
import type { ChatUIMessage } from "@/ai/messages/types";
import { streamChatResponse } from "@/ai/response/stream-chat-response";
import { calendarContextSchema } from "@/lib/calendar-context";

const bodySchema = z.object({
  messages: z.array(z.unknown()),
  gatewayApiKey: z.string().optional(),
  calendarContext: calendarContextSchema,
});

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return new Response("Invalid request body", { status: 400 });
  }

  const { gatewayApiKey, calendarContext } = body.data;

  let messages: ChatUIMessage[];
  try {
    // No metadataSchema: ours is an empty object and messages legitimately
    // arrive with `metadata: undefined`, which a schema would reject.
    messages = await validateUIMessages<ChatUIMessage>({
      messages: body.data.messages,
      dataSchemas: {
        "create-event": createEventDataSchema,
        "update-event": updateEventDataSchema,
        "delete-event": deleteEventDataSchema,
      },
    });
  } catch {
    return new Response("Invalid messages", { status: 400 });
  }

  // Key resolution: dev uses the env key; the SECRET_KEY sentinel swaps to
  // the env key in prod; otherwise the client supplies its own gateway key.
  const isLocal = process.env.NODE_ENV === "development";
  const isSecretKey = !!process.env.SECRET_KEY && gatewayApiKey === process.env.SECRET_KEY;
  const apiKey = isSecretKey || isLocal ? process.env.AI_GATEWAY_API_KEY : gatewayApiKey;
  if (!apiKey) {
    return new Response("Gateway API key is required", { status: 400 });
  }

  return streamChatResponse(messages, apiKey, calendarContext);
}
