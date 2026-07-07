"use client";

import { useEffect, useRef } from "react";
import { format, isToday, set } from "date-fns";

import { eventColorClass } from "@/components/calendar/event-styles";
import { eventsOnDay, formatEventTime, layoutDayEvents, weekDays } from "@/lib/date";
import type { CalendarEvent } from "@/lib/event";
import { cn } from "@/lib/utils";

const HOUR_HEIGHT_PX = 48;

interface WeekViewProps {
  events: readonly CalendarEvent[];
  focusDate: Date;
  onSlotClick: (start: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export const WeekView = ({ events, focusDate, onSlotClick, onEventClick }: WeekViewProps) => {
  const days = weekDays(focusDate);
  const gridRef = useRef<HTMLDivElement>(null);

  // Start the grid at working hours instead of midnight.
  useEffect(() => {
    gridRef.current?.scrollTo({ top: 7.5 * HOUR_HEIGHT_PX });
  }, []);
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Day headings + all-day row */}
      <div className="grid shrink-0 grid-cols-[3.5rem_repeat(7,1fr)] border-b">
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className="border-l py-1.5 text-center text-xs">
            <div className="text-muted-foreground">{format(day, "EEE")}</div>
            <div
              className={cn(
                "mx-auto flex size-6 items-center justify-center rounded-full text-sm",
                isToday(day) && "bg-primary font-semibold text-primary-foreground",
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
        <div className="py-1 pr-1 text-right text-[10px] text-muted-foreground">all-day</div>
        {days.map((day) => {
          const allDayEvents = eventsOnDay(events, day).filter((event) => event.allDay);
          return (
            <div
              key={day.toISOString()}
              className="flex min-h-6 flex-col gap-0.5 border-t border-l p-0.5"
            >
              {allDayEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEventClick(event)}
                  className={cn(
                    "w-full truncate rounded-sm border-l-2 px-1.5 py-0.5 text-left text-xs",
                    eventColorClass(event.color),
                  )}
                >
                  {event.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      {/* Time grid */}
      <div ref={gridRef} className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)]">
          {/* Hour labels */}
          <div className="relative" style={{ height: 24 * HOUR_HEIGHT_PX }}>
            {Array.from({ length: 23 }, (_, index) => index + 1).map((hour) => (
              <span
                key={hour}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground"
                style={{ top: hour * HOUR_HEIGHT_PX }}
              >
                {format(set(new Date(), { hours: hour, minutes: 0 }), "ha")}
              </span>
            ))}
          </div>
          {days.map((day) => {
            const positioned = layoutDayEvents(events, day);
            return (
              <div
                key={day.toISOString()}
                className="relative border-l"
                style={{ height: 24 * HOUR_HEIGHT_PX }}
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <button
                    key={hour}
                    type="button"
                    aria-label={`Create event on ${format(day, "MMM d")} at ${format(set(day, { hours: hour }), "ha")}`}
                    onClick={() =>
                      onSlotClick(
                        set(day, {
                          hours: hour,
                          minutes: 0,
                          seconds: 0,
                          milliseconds: 0,
                        }),
                      )
                    }
                    className="absolute right-0 left-0 border-b border-border/60 transition-colors hover:bg-muted/40"
                    style={{
                      top: hour * HOUR_HEIGHT_PX,
                      height: HOUR_HEIGHT_PX,
                    }}
                  />
                ))}
                {positioned.map(({ event, startMinutes, durationMinutes, lane, laneCount }) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onEventClick(event)}
                    className={cn(
                      "absolute overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-left text-xs",
                      eventColorClass(event.color),
                    )}
                    style={{
                      top: (startMinutes / 60) * HOUR_HEIGHT_PX,
                      height: Math.max((durationMinutes / 60) * HOUR_HEIGHT_PX - 2, 20),
                      left: `calc(${(lane / laneCount) * 100}% + 2px)`,
                      width: `calc(${100 / laneCount}% - 4px)`,
                    }}
                  >
                    <div className="truncate font-medium">{event.title}</div>
                    {durationMinutes >= 45 && (
                      <div className="truncate opacity-70">
                        {formatEventTime(event.start)} – {formatEventTime(event.end)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
