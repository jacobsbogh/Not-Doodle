import { FormEvent, useMemo, useState } from "react";
import { serverTimestamp, setDoc } from "firebase/firestore";
import { Calendar, CalendarPlus, Clock, Plus, X } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { nextMeetingDoc } from "../../lib/firebaseData";
import {
  formatDateOnly,
  formatDateTime,
  formatTimeOnly,
  makeId,
} from "../../lib/format";
import type { Meeting } from "../../types/domain";

type DatePollFormProps = {
  meeting: Meeting | null;
  onDone: () => void;
};

type SlotGroup = {
  date: string;
  label: string;
  slots: string[];
};

const suggestedTimes = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];

function sortValues(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function timeLabel(time: string) {
  return formatTimeOnly(`2000-01-01T${time}`);
}

function groupSlotsByDate(slots: string[]): SlotGroup[] {
  const groups = new Map<string, string[]>();

  slots.forEach((slot) => {
    const date = slot.slice(0, 10);
    groups.set(date, [...(groups.get(date) ?? []), slot]);
  });

  return [...groups.entries()].map(([date, groupSlots]) => ({
    date,
    label: formatDateOnly(`${date}T12:00`),
    slots: sortValues(groupSlots),
  }));
}

export function DatePollForm({ meeting, onDone }: DatePollFormProps) {
  const [dates, setDates] = useState<string[]>([]);
  const [timeValue, setTimeValue] = useState("19:00");
  const [times, setTimes] = useState<string[]>(["19:00"]);
  const [removedSlots, setRemovedSlots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const existingOptions = meeting?.dateOptions ?? [];
  const existingStarts = useMemo(
    () =>
      new Set(
        existingOptions.map((option) => option.startsAt).filter(Boolean),
      ),
    [existingOptions],
  );
  const draftSlots = useMemo(() => {
    const removed = new Set(removedSlots);

    return dates
      .flatMap((date) => times.map((time) => `${date}T${time}`))
      .filter((slot) => !removed.has(slot))
      .sort((a, b) => a.localeCompare(b));
  }, [dates, removedSlots, times]);
  const slotGroups = useMemo(() => groupSlotsByDate(draftSlots), [draftSlots]);
  const slotsToAdd = useMemo(
    () => draftSlots.filter((slot) => !existingStarts.has(slot)),
    [draftSlots, existingStarts],
  );
  const selectedCalendarDates = useMemo(
    () => dates.map(dateFromKey),
    [dates],
  );

  function selectDates(selected: Date[] | undefined) {
    const nextDates = sortValues([
      ...new Set((selected ?? []).map((date) => dateKey(date))),
    ]);
    const selectedDateSet = new Set(nextDates);

    setDates(nextDates);
    setRemovedSlots((current) =>
      current.filter((slot) => selectedDateSet.has(slot.slice(0, 10))),
    );
  }

  function removeDate(date: string) {
    setDates((current) => current.filter((item) => item !== date));
    setRemovedSlots((current) =>
      current.filter((slot) => !slot.startsWith(`${date}T`)),
    );
  }

  function toggleTime(time: string) {
    setTimes((current) =>
      current.includes(time)
        ? current.filter((item) => item !== time)
        : sortValues([...current, time]),
    );
  }

  function addTime(event: FormEvent) {
    event.preventDefault();

    if (!timeValue) {
      return;
    }

    setTimes((current) => sortValues([...new Set([...current, timeValue])]));
  }

  function removeTime(time: string) {
    setTimes((current) => current.filter((item) => item !== time));
    setRemovedSlots((current) =>
      current.filter((slot) => !slot.endsWith(`T${time}`)),
    );
  }

  function removeSlot(slot: string) {
    setRemovedSlots((current) =>
      current.includes(slot) ? current : [...current, slot],
    );
  }

  async function addToMeeting(event: FormEvent) {
    event.preventDefault();
    const newOptions = slotsToAdd
      .map((startsAt) => ({
        id: makeId(),
        label: formatDateTime(startsAt),
        startsAt,
      }));

    if (newOptions.length === 0) {
      return;
    }

    const existingStarts = new Set(
      existingOptions.map((option) => option.startsAt).filter(Boolean),
    );
    const nextOptions = [
      ...existingOptions,
      ...newOptions.filter((option) => !existingStarts.has(option.startsAt)),
    ].sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));

    setBusy(true);
    await setDoc(
      nextMeetingDoc(),
      {
        title: meeting?.title ?? "Next book club",
        dateOptions: nextOptions,
        bookOptions: meeting?.bookOptions ?? [],
        dateVotes: meeting?.dateVotes ?? {},
        bookVotes: meeting?.bookVotes ?? {},
        chosenDateOptionId: meeting?.chosenDateOptionId ?? "",
        chosenBookOptionId: meeting?.chosenBookOptionId ?? "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "open",
      },
      { merge: true },
    );
    setBusy(false);
    onDone();
  }

  return (
    <section className="composer">
      <div className="composer-head">
        <div>
          <p className="eyebrow">Next meeting</p>
          <h2>Add meeting times</h2>
        </div>
        <button className="ghost compact" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>

      <div className="schedule-builder">
        <section className="schedule-panel">
          <div className="section-title">
            <h3>Days</h3>
            <span>{dates.length} selected</span>
          </div>
          <div className="date-picker-card">
            <DayPicker
              captionLayout="dropdown"
              fixedWeeks
              mode="multiple"
              numberOfMonths={1}
              selected={selectedCalendarDates}
              showOutsideDays
              weekStartsOn={1}
              onSelect={selectDates}
            />
          </div>
          <div className="chip-list">
            {dates.map((date) => (
              <button
                className="filter-chip selected"
                key={date}
                type="button"
                onClick={() => removeDate(date)}
              >
                <Calendar size={16} />
                {formatDateOnly(`${date}T12:00`)}
                <X size={15} />
              </button>
            ))}
          </div>
        </section>

        <section className="schedule-panel">
          <div className="section-title">
            <h3>Times</h3>
            <span>{times.length} selected</span>
          </div>
          <div className="time-preset-grid">
            {suggestedTimes.map((time) => (
              <button
                className={times.includes(time) ? "filter-chip selected" : "filter-chip"}
                key={time}
                type="button"
                onClick={() => toggleTime(time)}
              >
                <Clock size={16} />
                {timeLabel(time)}
              </button>
            ))}
          </div>
          <form className="compact-adder" onSubmit={addTime}>
            <label>
              Custom time
              <input
                step="900"
                type="time"
                value={timeValue}
                onChange={(event) => setTimeValue(event.target.value)}
                required
              />
            </label>
            <button className="secondary" type="submit">
              <Plus size={18} />
              Add
            </button>
          </form>
          <div className="chip-list">
            {times
              .filter((time) => !suggestedTimes.includes(time))
              .map((time) => (
                <button
                  className="filter-chip selected"
                  key={time}
                  type="button"
                  onClick={() => removeTime(time)}
                >
                  <Clock size={16} />
                  {timeLabel(time)}
                  <X size={15} />
                </button>
              ))}
          </div>
        </section>
      </div>

      <section className="slot-preview">
        <div className="section-title">
          <h3>Preview</h3>
          <span>
            {slotsToAdd.length} new / {draftSlots.length} total
          </span>
        </div>
        {dates.length === 0 || times.length === 0 ? (
          <p className="notice">Pick at least one day and one time.</p>
        ) : (
          <div className="slot-preview-grid">
            {slotGroups.map((group) => (
              <div className="slot-day" key={group.date}>
                <div className="slot-day-head">
                  <Calendar size={17} />
                  <strong>{group.label}</strong>
                </div>
                <div className="slot-pill-grid">
                  {group.slots.map((slot) => {
                    const alreadyAdded = existingStarts.has(slot);

                    return (
                      <span
                        className={alreadyAdded ? "slot-pill existing" : "slot-pill"}
                        key={slot}
                      >
                        {formatTimeOnly(slot)}
                        {alreadyAdded ? (
                          <small>Added</small>
                        ) : (
                          <button
                            className="slot-remove"
                            type="button"
                            title="Remove time"
                            onClick={() => removeSlot(slot)}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <form onSubmit={addToMeeting}>
        <button
          className="primary wide"
          type="submit"
          disabled={busy || slotsToAdd.length === 0}
        >
          <CalendarPlus size={18} />
          Add {slotsToAdd.length} new times to next meeting
        </button>
      </form>
    </section>
  );
}
