import { addDays, set, startOfWeek } from "date-fns";

import { toLocalIso } from "@/lib/date";
import type { CalendarEvent } from "@/lib/event";
import type { EventColor } from "@/lib/event";

interface SeedSpec {
  title: string;
  /** Day offset from the start (Sunday) of the current week. */
  dayOffset: number;
  startHour: number;
  durationHours: number;
  allDay?: boolean;
  description?: string;
  color?: EventColor;
}

const seeds: SeedSpec[] = [
  {
    title: "Team standup",
    dayOffset: 1,
    startHour: 9.5,
    durationHours: 0.5,
    color: "blue",
    description: "Daily sync with the product team",
  },
  {
    title: "Design review",
    dayOffset: 1,
    startHour: 14,
    durationHours: 1,
    color: "purple",
  },
  {
    title: "Lunch with Alex",
    dayOffset: 2,
    startHour: 12,
    durationHours: 1,
    color: "green",
  },
  {
    title: "1:1 with manager",
    dayOffset: 3,
    startHour: 11,
    durationHours: 0.5,
    color: "blue",
  },
  {
    title: "Quarterly planning",
    dayOffset: 3,
    startHour: 15,
    durationHours: 2,
    color: "amber",
    description: "Roadmap review for next quarter",
  },
  {
    title: "Gym",
    dayOffset: 4,
    startHour: 18,
    durationHours: 1,
    color: "red",
  },
  {
    title: "Ship day",
    dayOffset: 5,
    startHour: 0,
    durationHours: 24,
    allDay: true,
    color: "amber",
  },
  {
    title: "Brunch",
    dayOffset: 7,
    startHour: 11,
    durationHours: 1.5,
    color: "green",
  },
];

/** ~8 plausible events around the current week so the demo isn't empty. */
export const seedEvents = (): CalendarEvent[] => {
  const weekStart = startOfWeek(new Date());
  return seeds.map((seed, index) => {
    const day = addDays(weekStart, seed.dayOffset);
    const start = set(day, {
      hours: Math.floor(seed.startHour),
      minutes: Math.round((seed.startHour % 1) * 60),
      seconds: 0,
      milliseconds: 0,
    });
    const end = new Date(start.getTime() + seed.durationHours * 60 * 60 * 1000);
    return {
      id: `seed-${index + 1}`,
      title: seed.title,
      start: toLocalIso(start),
      end: toLocalIso(end),
      allDay: seed.allDay ?? false,
      description: seed.description,
      color: seed.color,
    };
  });
};
