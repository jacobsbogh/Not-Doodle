import { FormEvent, useState } from "react";
import { serverTimestamp, setDoc } from "firebase/firestore";
import { Calendar, CalendarPlus, Clock, Plus, Trash2 } from "lucide-react";
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

export function DatePollForm({ meeting, onDone }: DatePollFormProps) {
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("19:00");
  const [dates, setDates] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function addDateOption(event: FormEvent) {
    event.preventDefault();

    if (!dateValue || !timeValue) {
      return;
    }

    const next = `${dateValue}T${timeValue}`;
    setDates((current) =>
      current.includes(next)
        ? current
        : [...current, next].sort((a, b) => a.localeCompare(b)),
    );
  }

  async function addToMeeting(event: FormEvent) {
    event.preventDefault();
    const newOptions = dates
      .filter(Boolean)
      .map((startsAt) => ({
        id: makeId(),
        label: formatDateTime(startsAt),
        startsAt,
      }));

    if (newOptions.length === 0) {
      return;
    }

    const existingOptions = meeting?.dateOptions ?? [];
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

      <form className="date-builder" onSubmit={addDateOption}>
        <label>
          Date
          <input
            type="date"
            value={dateValue}
            onChange={(event) => setDateValue(event.target.value)}
            required
          />
        </label>
        <label>
          Time
          <input
            type="time"
            value={timeValue}
            onChange={(event) => setTimeValue(event.target.value)}
            required
          />
        </label>
        <button className="secondary" type="submit">
          <Plus size={18} />
          Add option
        </button>
      </form>

      <div className="date-option-list">
        {dates.length === 0 ? (
          <p className="notice">Add one or more possible times for the next meeting.</p>
        ) : (
          dates.map((value) => (
            <div className="date-option-row" key={value}>
              <span>
                <Calendar size={17} />
                {formatDateOnly(value)}
              </span>
              <strong>
                <Clock size={17} />
                {formatTimeOnly(value)}
              </strong>
              <button
                className="icon-button danger"
                type="button"
                title="Remove time"
                onClick={() =>
                  setDates((current) => current.filter((item) => item !== value))
                }
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={addToMeeting}>
        <button className="primary wide" type="submit" disabled={busy || dates.length === 0}>
          <CalendarPlus size={18} />
          Add {dates.length} times to next meeting
        </button>
      </form>
    </section>
  );
}
