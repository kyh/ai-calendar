import { addDays, set, startOfWeek } from "date-fns";

import { toLocalIso } from "@/lib/date";
import type { CalendarEvent, EventColor } from "@/lib/event";

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
    color: "blue",
    dayOffset: 1,
    description: "Daily sync with the product team",
    durationHours: 0.5,
    startHour: 9.5,
    title: "Team standup",
  },
  {
    color: "purple",
    dayOffset: 1,
    durationHours: 1,
    startHour: 14,
    title: "Design review",
  },
  {
    color: "green",
    dayOffset: 2,
    durationHours: 1,
    startHour: 12,
    title: "Lunch with Alex",
  },
  {
    color: "blue",
    dayOffset: 3,
    durationHours: 0.5,
    startHour: 11,
    title: "1:1 with manager",
  },
  {
    color: "amber",
    dayOffset: 3,
    description: "Roadmap review for next quarter",
    durationHours: 2,
    startHour: 15,
    title: "Quarterly planning",
  },
  {
    color: "red",
    dayOffset: 4,
    durationHours: 1,
    startHour: 18,
    title: "Gym",
  },
  {
    allDay: true,
    color: "amber",
    dayOffset: 5,
    durationHours: 24,
    startHour: 0,
    title: "Ship day",
  },
  {
    color: "green",
    dayOffset: 7,
    durationHours: 1.5,
    startHour: 11,
    title: "Brunch",
  },
];

/** ~8 plausible events around the current week so the demo isn't empty. */
export const seedEvents = (): CalendarEvent[] => {
  const weekStart = startOfWeek(new Date());
  return seeds.map((seed, index) => {
    const day = addDays(weekStart, seed.dayOffset);
    const start = set(day, {
      hours: Math.floor(seed.startHour),
      milliseconds: 0,
      minutes: Math.round((seed.startHour % 1) * 60),
      seconds: 0,
    });
    const end = new Date(start.getTime() + seed.durationHours * 60 * 60 * 1000);
    return {
      allDay: seed.allDay ?? false,
      color: seed.color,
      description: seed.description,
      end: toLocalIso(end),
      id: `seed-${index + 1}`,
      start: toLocalIso(start),
      title: seed.title,
    };
  });
};
