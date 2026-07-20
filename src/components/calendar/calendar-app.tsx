"use client";

import { useEffect, useState } from "react";
import { addMonths, addWeeks, set } from "date-fns";

import { CalendarHeader, type CalendarView } from "@/components/calendar/calendar-header";
import { EventDialog, type EventDialogState } from "@/components/calendar/event-dialog";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Spinner } from "@/components/ui/spinner";
import type { CalendarEvent } from "@/lib/event";
import { useEventStore } from "@/lib/event-store";

export const CalendarApp = () => {
  const events = useEventStore((store) => store.events);
  const hasHydrated = useEventStore((store) => store.hasHydrated);
  const [view, setView] = useState<CalendarView>("month");
  // `null` until mounted: the wall clock differs between the server render
  // (UTC on Vercel) and the browser's local zone, so at a month/week boundary
  // an SSR'd date label would disagree with the client and break hydration.
  // Reading the clock in an effect keeps every clock-derived value off the server.
  const [focusDate, setFocusDate] = useState<Date | null>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [dialogState, setDialogState] = useState<EventDialogState>({
    mode: "closed",
  });

  useEffect(() => setFocusDate(new Date()), []);

  const step = (direction: 1 | -1) => {
    setFocusDate((current) => {
      if (current === null) return null;
      return view === "month" ? addMonths(current, direction) : addWeeks(current, direction);
    });
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
        onToday={() => setFocusDate(new Date())}
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
