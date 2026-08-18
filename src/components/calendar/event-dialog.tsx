"use client";

import { useState } from "react";
import { format, parseISO, set } from "date-fns";
import { CalendarIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toLocalIso } from "@/lib/date";
import {
  eventColors,
  eventColorSchema,
  type CalendarEvent,
  type CalendarEventInput,
  type EventColor,
} from "@/lib/event";
import { useEventStore } from "@/lib/event-store";

export type EventDialogState =
  | { mode: "closed" }
  | { mode: "create"; start: Date; allDay: boolean }
  | { mode: "edit"; event: CalendarEvent };

interface EventDialogProps {
  state: EventDialogState;
  onClose: () => void;
}

export const EventDialog = ({ state, onClose }: EventDialogProps) => (
  <Dialog
    open={state.mode !== "closed"}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    {state.mode !== "closed" && (
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <EventForm state={state} onClose={onClose} />
      </DialogContent>
    )}
  </Dialog>
);

interface FormValues {
  title: string;
  allDay: boolean;
  startDate: Date;
  startTime: string;
  endDate: Date;
  endTime: string;
  color: EventColor;
  description: string;
}

const initialValues = (state: Exclude<EventDialogState, { mode: "closed" }>): FormValues => {
  if (state.mode === "edit") {
    const start = parseISO(state.event.start);
    const end = parseISO(state.event.end);
    return {
      title: state.event.title,
      allDay: state.event.allDay,
      startDate: start,
      startTime: format(start, "HH:mm"),
      endDate: end,
      endTime: format(end, "HH:mm"),
      color: state.event.color ?? "default",
      description: state.event.description ?? "",
    };
  }
  const start = state.start;
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    allDay: state.allDay,
    startDate: start,
    startTime: format(start, "HH:mm"),
    endDate: end,
    endTime: format(end, "HH:mm"),
    color: "default",
    description: "",
  };
};

const combine = (date: Date, time: string): Date => {
  const [rawHours, rawMinutes] = time.split(":");
  const hours = Number.parseInt(rawHours ?? "", 10);
  const minutes = Number.parseInt(rawMinutes ?? "", 10);
  return set(date, {
    hours: Number.isNaN(hours) ? 0 : hours,
    minutes: Number.isNaN(minutes) ? 0 : minutes,
    seconds: 0,
    milliseconds: 0,
  });
};

const EventForm = ({
  state,
  onClose,
}: {
  state: Exclude<EventDialogState, { mode: "closed" }>;
  onClose: () => void;
}) => {
  const [values, setValues] = useState<FormValues>(() => initialValues(state));
  const [error, setError] = useState<string | undefined>(undefined);
  const addEvent = useEventStore((store) => store.addEvent);
  const updateEvent = useEventStore((store) => store.updateEvent);
  const deleteEvent = useEventStore((store) => store.deleteEvent);

  const submit = (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    const title = values.title.trim();
    if (title.length === 0) {
      setError("Title is required.");
      return;
    }
    const start = values.allDay
      ? set(values.startDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 })
      : combine(values.startDate, values.startTime);
    const end = values.allDay
      ? set(values.endDate, { hours: 23, minutes: 59, seconds: 59, milliseconds: 0 })
      : combine(values.endDate, values.endTime);
    if (end < start) {
      setError("End must be after start.");
      return;
    }
    const description = values.description.trim();
    if (state.mode === "edit") {
      // Always include description + color so clears (empty / "default") apply
      // — the store folds the patch over the event, so omitting a field keeps
      // the old value instead of removing it.
      updateEvent(state.event.id, {
        title,
        start: toLocalIso(start),
        end: toLocalIso(end),
        allDay: values.allDay,
        description: description.length > 0 ? description : undefined,
        color: values.color === "default" ? undefined : values.color,
      });
    } else {
      const input: CalendarEventInput = {
        title,
        start: toLocalIso(start),
        end: toLocalIso(end),
        allDay: values.allDay,
        description: description.length > 0 ? description : undefined,
        color: values.color === "default" ? undefined : values.color,
      };
      addEvent(input);
    }
    onClose();
  };

  const dateField = (
    label: string,
    dateKey: "startDate" | "endDate",
    timeKey: "startTime" | "endTime",
  ) => (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger
            render={<Button variant="outline" className="flex-1 justify-start font-normal" />}
          >
            <CalendarIcon />
            {format(values[dateKey], "EEE, MMM d, yyyy")}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={values[dateKey]}
              onSelect={(selected) => {
                if (selected !== undefined) {
                  setValues((previous) => ({ ...previous, [dateKey]: selected }));
                }
              }}
            />
          </PopoverContent>
        </Popover>
        {!values.allDay && (
          <Input
            type="time"
            className="w-28"
            value={values[timeKey]}
            onChange={(changeEvent) =>
              setValues((previous) => ({
                ...previous,
                [timeKey]: changeEvent.target.value,
              }))
            }
          />
        )}
      </div>
    </Field>
  );

  return (
    <form onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>{state.mode === "edit" ? "Edit event" : "New event"}</DialogTitle>
        <DialogDescription>
          {state.mode === "edit"
            ? "Update the details of this event."
            : "Add an event to your calendar."}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="my-6">
        <Field>
          <FieldLabel htmlFor="event-title">Title</FieldLabel>
          <Input
            id="event-title"
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- first field of a modal opened on user intent
            autoFocus
            placeholder="Lunch with Sam"
            value={values.title}
            onChange={(changeEvent) =>
              setValues((previous) => ({
                ...previous,
                title: changeEvent.target.value,
              }))
            }
          />
        </Field>
        <Field orientation="horizontal">
          <FieldLabel htmlFor="event-all-day">All day</FieldLabel>
          <Switch
            id="event-all-day"
            checked={values.allDay}
            onCheckedChange={(checked) =>
              setValues((previous) => ({ ...previous, allDay: checked }))
            }
          />
        </Field>
        {dateField("Start", "startDate", "startTime")}
        {dateField("End", "endDate", "endTime")}
        <Field>
          <FieldLabel>Color</FieldLabel>
          <Select
            value={values.color}
            onValueChange={(value) => {
              const parsed = eventColorSchema.safeParse(value);
              if (parsed.success) {
                setValues((previous) => ({ ...previous, color: parsed.data }));
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eventColors.map((color) => (
                <SelectItem key={color} value={color}>
                  <span className="capitalize">{color}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="event-description">Description</FieldLabel>
          <Textarea
            id="event-description"
            placeholder="Optional notes"
            rows={2}
            value={values.description}
            onChange={(changeEvent) =>
              setValues((previous) => ({
                ...previous,
                description: changeEvent.target.value,
              }))
            }
          />
        </Field>
        {error !== undefined && <FieldError>{error}</FieldError>}
      </FieldGroup>
      <DialogFooter>
        {state.mode === "edit" && (
          <Button
            type="button"
            variant="destructive"
            className="mr-auto"
            onClick={() => {
              deleteEvent(state.event.id);
              onClose();
            }}
          >
            <Trash2Icon />
            Delete
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{state.mode === "edit" ? "Save" : "Create"}</Button>
      </DialogFooter>
    </form>
  );
};
