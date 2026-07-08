"use client";

import { useEffect, useRef, useState } from "react";
import type { EveMessage, EveMessagePart } from "eve/react";
import { useEveAgent } from "eve/react";
import {
  CalendarCheckIcon,
  CalendarMinusIcon,
  CalendarPlusIcon,
  CircleAlertIcon,
  KeyIcon,
  SendIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { ApiKeyDialog, GATEWAY_API_KEY_STORAGE_KEY } from "@/components/chat/api-key-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  createEventPayloadSchema,
  deleteEventPayloadSchema,
  updateEventPayloadSchema,
} from "@/lib/assistant-schemas";
import { buildCalendarContext } from "@/lib/calendar-context";
import { useEventStore } from "@/lib/event-store";
import { cn } from "@/lib/utils";

const examplePrompts = [
  "Lunch with Sam tomorrow at noon",
  "Move my 3pm to Thursday",
  "What does next week look like?",
];

/**
 * BYO-key transport: the stored gateway key rides as a bearer header on
 * every eve request (the channel verifier hands it to the dynamic model
 * resolver). Read from localStorage on every request — eve captures this
 * resolver once at store creation, so React state would go stale.
 */
const resolveAuthHeaders = (): Readonly<Record<string, string>> => {
  if (typeof window === "undefined") return {};
  const key = window.localStorage.getItem(GATEWAY_API_KEY_STORAGE_KEY);
  return key !== null && key.length > 0 ? { authorization: `Bearer ${key}` } : {};
};

// -----------------------------------------------------------------------------
// Tool results -> store mutations
//
// eve streams every tool result as an `action.result` event whose
// `data.result` is `{ kind: "tool-result", toolName, output, isError? }`,
// where `output` is the tool's full `execute` return value. Each payload is
// zod-parsed against the shared schemas before touching the store.
// -----------------------------------------------------------------------------

const toolResultEventSchema = z.object({
  type: z.literal("action.result"),
  data: z.object({
    status: z.enum(["completed", "failed", "rejected"]),
    result: z.object({
      kind: z.literal("tool-result"),
      toolName: z.string(),
      output: z.unknown(),
      isError: z.boolean().optional(),
    }),
  }),
});

/** `subagent.event` wraps a child session's stream event under `data.event`. */
const subagentEventSchema = z.object({
  type: z.literal("subagent.event"),
  data: z.object({ event: z.unknown() }),
});

const applyToolResult = (event: unknown): void => {
  // Delegation is forbidden by the instructions, but if the model strays,
  // unwrap the child's events so its tool results still reach the store.
  const wrapped = subagentEventSchema.safeParse(event);
  if (wrapped.success) {
    applyToolResult(wrapped.data.data.event);
    return;
  }
  const parsed = toolResultEventSchema.safeParse(event);
  if (!parsed.success) return;
  const { status, result } = parsed.data.data;
  if (status !== "completed" || result.isError === true) return;

  const store = useEventStore.getState();
  switch (result.toolName) {
    case "create_event": {
      const payload = createEventPayloadSchema.safeParse(result.output);
      if (!payload.success) return;
      store.upsertEvent(payload.data.event);
      toast.success(`Created "${payload.data.event.title}"`);
      break;
    }
    case "update_event": {
      const payload = updateEventPayloadSchema.safeParse(result.output);
      if (!payload.success) return;
      const { id, patch } = payload.data;
      const event = store.events.find((e) => e.id === id);
      if (!event) {
        toast.error("The assistant tried to update an event that no longer exists");
        return;
      }
      store.updateEvent(id, patch);
      toast.success(`Updated "${patch.title ?? event.title}"`);
      break;
    }
    case "delete_event": {
      const payload = deleteEventPayloadSchema.safeParse(result.output);
      if (!payload.success) return;
      const event = store.events.find((e) => e.id === payload.data.id);
      if (!event) return;
      store.deleteEvent(event.id);
      toast.success(`Deleted "${event.title}"`);
      break;
    }
  }
};

/**
 * Auth-shaped failures: a 401 from the channel (keyless in prod), a
 * rejected gateway key at the model call, or a missing server key in dev.
 * All of them route back to the key dialog.
 */
const isAuthError = (error: Error): boolean =>
  /unauthorized|forbidden|authentication|api.?key|credential|401|403/i.test(error.message);

export const ChatPanel = () => {
  const [apiKey, , removeApiKey] = useLocalStorage(GATEWAY_API_KEY_STORAGE_KEY, "");
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const agent = useEveAgent({
    headers: resolveAuthHeaders,
    onEvent: applyToolResult,
    onError: (error) => {
      if (isAuthError(error)) {
        removeApiKey();
        toast.error("Invalid API key. Please enter a valid Vercel AI Gateway API key.");
        setShowApiKeyDialog(true);
      } else {
        toast.error(error.message || "Something went wrong");
      }
    },
  });
  const { data, status, error } = agent;

  const isLoading = status === "submitted" || status === "streaming";
  const showKeyNotice = status === "error" && error !== undefined && isAuthError(error);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [data.messages, status]);

  const needsKey = !apiKey && process.env.NODE_ENV !== "development";

  const send = (message: string) => {
    const trimmed = message.trim();
    if (trimmed.length === 0 || isLoading) return;
    if (needsKey) {
      setShowApiKeyDialog(true);
      return;
    }
    const clientContext = buildCalendarContext(useEventStore.getState().events);
    agent.send({ message: trimmed, clientContext }).catch(() => undefined); // failures surface via status/error/onError
    setInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <SparklesIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Assistant</span>
        <div className="ml-auto flex items-center gap-1">
          {isLoading && <Spinner className="size-4" />}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Set API key"
            onClick={() => setShowApiKeyDialog(true)}
          >
            <KeyIcon />
          </Button>
        </div>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-3">
        {data.messages.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Manage your schedule in natural language. Try:
            </p>
            {examplePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => send(prompt)}
                className="rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {status === "submitted" && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Spinner className="size-3.5" />
                Thinking…
              </div>
            )}
            {showKeyNotice && (
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                The assistant needs a Vercel AI Gateway key —{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setShowApiKeyDialog(true)}
                >
                  add yours
                </button>{" "}
                or set <code className="font-mono">AI_GATEWAY_API_KEY</code> on the server.
              </div>
            )}
          </div>
        )}
      </div>
      <form
        className="flex shrink-0 gap-2 border-t p-3"
        onSubmit={(formEvent) => {
          formEvent.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(changeEvent) => setInput(changeEvent.target.value)}
          onFocus={() => {
            if (needsKey) setShowApiKeyDialog(true);
          }}
          placeholder="Ask about your schedule…"
          aria-label="Message the assistant"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || input.trim().length === 0}
          aria-label="Send"
        >
          <SendIcon />
        </Button>
      </form>
      <ApiKeyDialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog} />
    </div>
  );
};

// -----------------------------------------------------------------------------
// Message rendering — eve's default reducer projects `data.messages` in the
// AI SDK UIMessage convention: text parts plus `dynamic-tool` parts.
// -----------------------------------------------------------------------------

function ChatMessage({ message }: { message: EveMessage }) {
  return (
    <div className={cn("flex flex-col gap-1.5", message.role === "user" && "items-end")}>
      {message.parts.map((part, index) => {
        const key = `${message.id}-${index}`;
        if (part.type === "text" && part.text.length > 0) {
          return (
            <div
              key={key}
              className={cn(
                "max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm whitespace-pre-wrap",
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {part.text}
            </div>
          );
        }
        if (part.type === "dynamic-tool") {
          return <ToolChip key={key} part={part} />;
        }
        return null;
      })}
    </div>
  );
}

type DynamicToolPart = Extract<EveMessagePart, { type: "dynamic-tool" }>;

const TOOL_META: Record<string, { icon: typeof CalendarPlusIcon; active: string; done: string }> = {
  create_event: { icon: CalendarPlusIcon, active: "Creating event", done: "Created event" },
  update_event: { icon: CalendarCheckIcon, active: "Updating event", done: "Updated event" },
  delete_event: { icon: CalendarMinusIcon, active: "Deleting event", done: "Deleted event" },
};

/** Loose view of tool inputs, for the chip detail line only. */
const toolInputPreviewSchema = z.object({
  title: z.string().optional(),
  id: z.string().optional(),
});

function ToolChip({ part }: { part: DynamicToolPart }) {
  const events = useEventStore((state) => state.events);

  const meta = TOOL_META[part.toolName];
  if (!meta) return null;

  const done = part.state === "output-available";
  const failed = part.state === "output-error" || part.state === "output-denied";
  const label = done ? meta.done : failed ? "Something went wrong" : `${meta.active}…`;
  const Icon = failed ? CircleAlertIcon : meta.icon;

  let detail = "";
  if (part.state === "input-available" || part.state === "output-available") {
    const input = toolInputPreviewSchema.safeParse(part.input);
    if (input.success) {
      detail =
        part.toolName === "create_event"
          ? (input.data.title ?? "")
          : (events.find((e) => e.id === input.data.id)?.title ?? "");
    }
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className={cn("size-3.5 shrink-0", failed && "text-destructive")} />
      <span className="truncate">
        {label}
        {detail ? ` — ${detail}` : ""}
      </span>
    </div>
  );
}
