import type { EventColor } from "@/lib/event";

/** Tint classes for event chips (month view) and blocks (week view). */
export const eventColorClasses = {
  default: "border-foreground/20 bg-muted text-foreground hover:bg-muted/80",
  blue: "border-blue-500/40 bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 dark:text-blue-300",
  green:
    "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300",
  red: "border-rose-500/40 bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:text-rose-300",
  amber:
    "border-amber-500/40 bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300",
  purple:
    "border-purple-500/40 bg-purple-500/15 text-purple-700 hover:bg-purple-500/25 dark:text-purple-300",
} satisfies Record<EventColor, string>;

export const eventColorClass = (color: EventColor | undefined): string =>
  eventColorClasses[color ?? "default"];
