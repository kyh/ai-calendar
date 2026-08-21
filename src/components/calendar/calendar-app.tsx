"use client";

import { useState, useSyncExternalStore } from "react";
import { addMonths, addWeeks, set, startOfToday } from "date-fns";

import { CalendarHeader, type CalendarView } from "@/components/calendar/calendar-header";
import { EventDialog, type EventDialogState } from "@/components/calendar/event-dialog";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Spinner } from "@/components/ui/spinner";
import type { CalendarEvent } from "@/lib/event";
import { useEventStore } from "@/lib/event-store";

/** The "store" never changes; only the server/client snapshot split matters. */
const subscribeToNothing = () => () => {};

export const CalendarApp = () => {
  const events = useEventStore((store) => store.events);
  const hasHydrated = useEventStore((store) => store.hasHydrated);
  const [view, setView] = useState<CalendarView>("month");
  // The wall clock differs between the server render (UTC on Vercel) and the
  // browser's local zone, so at a month/week boundary an SSR'd date label would
  // disagree with the client and break hydration. `useSyncExternalStore` renders
  // the server snapshot (`false`) on the server and through hydration, then
  // flips to the client snapshot, keeping every clock-derived value off the server.
  const isBrowser = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  // Only a deliberate navigation is stored; "today" stays derived.
  const [focusOverride, setFocusOverride] = useState<Date | null>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [dialogState, setDialogState] = useState<EventDialogState>({
    mode: "closed",
  });

  const focusDate = focusOverride ?? (isBrowser ? startOfToday() : null);

  const step = (direction: 1 | -1) => {
    if (focusDate === null) return;
    setFocusOverride(
      view === "month" ? addMonths(focusDate, direction) : addWeeks(focusDate, direction),
    );
  };

  const openCreate = (start: Date) => setDialogState({ mode: "create", start, allDay: false });

  const openEdit = (event: CalendarEvent) => setDialogState({ mode: "edit", event });

  return (
    <div className="flex h-dvh flex-col">
      <CalendarHeader
        focusDate={focusDate}
        view={view}
        chatOpen={chatOpen}
        onViewChange={setView}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToday={() => setFocusOverride(null)}
        onToggleChat={() => setChatOpen((open) => !open)}
      />
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1">
          {!hasHydrated || focusDate === null ? (
            <div className="flex h-full items-center justify-center">
              <Spinner className="size-5 text-muted-foreground" />
            </div>
          ) : view === "month" ? (
            <MonthView
              events={events}
              focusDate={focusDate}
              onDayClick={(day) =>
                openCreate(set(day, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }))
              }
              onEventClick={openEdit}
            />
          ) : (
            <WeekView
              events={events}
              focusDate={focusDate}
              onSlotClick={openCreate}
              onEventClick={openEdit}
            />
          )}
        </main>
        {chatOpen && (
          <aside className="hidden w-80 shrink-0 border-l md:block">
            <ChatPanel />
          </aside>
        )}
      </div>
      <EventDialog state={dialogState} onClose={() => setDialogState({ mode: "closed" })} />
    </div>
  );
};
