"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
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

import {
  createEventDataSchema,
  deleteEventDataSchema,
  updateEventDataSchema,
} from "@/ai/messages/data-parts";
import type { ChatUIMessage } from "@/ai/messages/types";
import { ApiKeyDialog, GATEWAY_API_KEY_STORAGE_KEY } from "@/components/chat/api-key-dialog";
import { demoTransport } from "@/components/chat/demo-transport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { buildCalendarContext } from "@/lib/calendar-context";
import { useEventStore } from "@/lib/event-store";
import { cn } from "@/lib/utils";

const examplePrompts = [
  "Lunch with Sam tomorrow at noon",
  "Move my 3pm to Thursday",
  "What does next week look like?",
];

type ToolPart = Extract<
  ChatUIMessage["parts"][number],
  { type: "tool-createEvent" | "tool-updateEvent" | "tool-deleteEvent" }
>;

const isToolPart = (part: ChatUIMessage["parts"][number]): part is ToolPart =>
  part.type === "tool-createEvent" ||
  part.type === "tool-updateEvent" ||
  part.type === "tool-deleteEvent";

const toolMeta = (part: ToolPart): { icon: typeof CalendarPlusIcon; label: string } => {
  switch (part.type) {
    case "tool-createEvent": {
      const title =
        part.state === "output-available" || part.state === "input-available"
          ? part.input.title
          : undefined;
      return {
        icon: CalendarPlusIcon,
        label:
          part.state === "output-available"
            ? `Created “${title}”`
            : title === undefined
              ? "Creating event…"
              : `Creating “${title}”…`,
      };
    }
    case "tool-updateEvent":
      return {
        icon: CalendarCheckIcon,
        label: part.state === "output-available" ? "Updated event" : "Updating event…",
      };
    case "tool-deleteEvent":
      return {
        icon: CalendarMinusIcon,
        label: part.state === "output-available" ? "Deleted event" : "Deleting event…",
      };
  }
};

export const ChatPanel = () => {
  const [apiKey, , removeApiKey] = useLocalStorage(GATEWAY_API_KEY_STORAGE_KEY, "");
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat<ChatUIMessage>({
    id: apiKey === "" ? "keyless" : apiKey,
    transport: apiKey === "demo" ? demoTransport : undefined,
    onError: (error) => {
      const message = error.message.toLowerCase();
      const isAuthError =
        message.includes("unauthorized") ||
        message.includes("authentication") ||
        message.includes("invalid api key") ||
        message.includes("gateway api key is required") ||
        message.includes("401") ||
        message.includes("403");
      if (isAuthError) {
        removeApiKey();
        toast.error("Invalid API key. Please enter a valid Vercel Gateway API key.");
        setShowApiKeyDialog(true);
      } else {
        toast.error(error.message || "Something went wrong");
      }
    },
    onData: (dataPart) => {
      const store = useEventStore.getState();
      switch (dataPart.type) {
        case "data-create-event": {
          const parsed = createEventDataSchema.safeParse(dataPart.data);
          if (parsed.success) store.upsertEvent(parsed.data.event);
          break;
        }
        case "data-update-event": {
          const parsed = updateEventDataSchema.safeParse(dataPart.data);
          if (parsed.success) store.updateEvent(parsed.data.id, parsed.data.patch);
          break;
        }
        case "data-delete-event": {
          const parsed = deleteEventDataSchema.safeParse(dataPart.data);
          if (parsed.success) store.deleteEvent(parsed.data.id);
          break;
        }
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const needsKey = !apiKey && process.env.NODE_ENV !== "development";

  const send = (message: string) => {
    const trimmed = message.trim();
    if (trimmed.length === 0 || busy) return;
    if (needsKey) {
      setShowApiKeyDialog(true);
      return;
    }
    setInput("");
    void sendMessage(
      { text: trimmed },
      {
        body: {
          gatewayApiKey: apiKey,
          calendarContext: buildCalendarContext(useEventStore.getState().events),
        },
      },
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <SparklesIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Assistant</span>
        <div className="ml-auto flex items-center gap-1">
          {busy && <Spinner className="size-4" />}
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
        {messages.length === 0 ? (
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
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex flex-col gap-1.5", message.role === "user" && "items-end")}
              >
                {message.parts.map((part, index) => {
                  if (part.type === "text" && part.text.length > 0) {
                    return (
                      <div
                        key={index}
                        className={cn(
                          "max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm whitespace-pre-wrap",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        {part.text}
                      </div>
                    );
                  }
                  if (isToolPart(part)) {
                    const failed = part.state === "output-error";
                    const meta = toolMeta(part);
                    const Icon = failed ? CircleAlertIcon : meta.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <Icon className={cn("size-3.5", failed && "text-destructive")} />
                        <span>{failed ? "Something went wrong" : meta.label}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ))}
            {status === "submitted" && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Spinner className="size-3.5" />
                Thinking…
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
          disabled={busy || input.trim().length === 0}
          aria-label="Send"
        >
          <SendIcon />
        </Button>
      </form>
      <ApiKeyDialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog} />
    </div>
  );
};
