"use client";

import { format, isSameDay, isSameMonth, isToday, parseISO } from "date-fns";

import { eventColorClass } from "@/components/calendar/event-styles";
import { eventsOnDay, formatEventTime, monthGridDays } from "@/lib/date";
import type { CalendarEvent } from "@/lib/event";
import { cn } from "@/lib/utils";

const MAX_CHIPS_PER_DAY = 3;

interface MonthViewProps {
  events: readonly CalendarEvent[];
  focusDate: Date;
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export const MonthView = ({ events, focusDate, onDayClick, onEventClick }: MonthViewProps) => {
  const days = monthGridDays(focusDate);
  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div key={label} className="py-1.5">
            {label}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7" style={{ gridAutoRows: "minmax(0, 1fr)" }}>
        {days.map((day) => {
          const dayEvents = eventsOnDay(events, day).sort((a, b) => {
            if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
            return a.start.localeCompare(b.start);
          });
          const overflow = dayEvents.length - MAX_CHIPS_PER_DAY;
          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              aria-label={`Create event on ${format(day, "MMMM d, yyyy")}`}
              onClick={() => onDayClick(day)}
              onKeyDown={(keyEvent) => {
                if (keyEvent.key === "Enter") onDayClick(day);
              }}
              className={cn(
                "flex min-h-24 cursor-pointer flex-col gap-1 overflow-hidden border-r border-b p-1 text-left transition-colors last:border-r-0 hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                !isSameMonth(day, focusDate) && "bg-muted/30",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs",
                  isToday(day) && "bg-primary font-semibold text-primary-foreground",
                  !isToday(day) && !isSameMonth(day, focusDate) && "text-muted-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              {dayEvents.slice(0, MAX_CHIPS_PER_DAY).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onEventClick(event);
                  }}
                  className={cn(
                    "w-full truncate rounded-sm border-l-2 px-1.5 py-0.5 text-left text-xs transition-colors",
                    eventColorClass(event.color),
                  )}
                >
                  {!event.allDay && isSameDay(parseISO(event.start), day) && (
                    <span className="mr-1 opacity-70">{formatEventTime(event.start)}</span>
                  )}
                  {event.title}
                </button>
              ))}
              {overflow > 0 && (
                <span className="px-1.5 text-xs text-muted-foreground">+{overflow} more</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
