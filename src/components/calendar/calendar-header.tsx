"use client";

import { ChevronLeftIcon, ChevronRightIcon, MessageSquareIcon } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { formatRangeLabel } from "@/lib/date";
import { cn } from "@/lib/utils";

export type CalendarView = "month" | "week";

interface CalendarHeaderProps {
  /** `null` before the client reads the clock — see calendar-app. */
  focusDate: Date | null;
  view: CalendarView;
  chatOpen: boolean;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onToggleChat: () => void;
}

export const CalendarHeader = ({
  focusDate,
  view,
  chatOpen,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onToggleChat,
}: CalendarHeaderProps) => (
  <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
    <h1 className="mr-2 text-sm font-semibold tracking-tight">AI Calendar</h1>
    <Button variant="outline" size="sm" onClick={onToday}>
      Today
    </Button>
    <Button variant="ghost" size="icon-sm" aria-label="Previous" onClick={onPrev}>
      <ChevronLeftIcon />
    </Button>
    <Button variant="ghost" size="icon-sm" aria-label="Next" onClick={onNext}>
      <ChevronRightIcon />
    </Button>
    <span className="ml-1 text-sm font-medium">
      {focusDate === null ? null : formatRangeLabel(focusDate, view)}
    </span>
    <div className="ml-auto flex items-center gap-2">
      <div className="flex rounded-md border p-0.5">
        {(["month", "week"] satisfies CalendarView[]).map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => onViewChange(candidate)}
            className={cn(
              "rounded-sm px-2.5 py-1 text-xs font-medium capitalize transition-colors",
              view === candidate
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {candidate}
          </button>
        ))}
      </div>
      <ThemeToggle />
      <Button
        variant={chatOpen ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label="Toggle assistant"
        className="hidden md:inline-flex"
        onClick={onToggleChat}
      >
        <MessageSquareIcon />
      </Button>
    </div>
  </header>
);
