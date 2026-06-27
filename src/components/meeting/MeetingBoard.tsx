import { useState, type ReactNode } from "react";
import { serverTimestamp, setDoc } from "firebase/firestore";
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Plus,
  RotateCcw,
  Trash2,
  Trophy,
  UserCheck,
} from "lucide-react";
import { nextMeetingDoc } from "../../lib/firebaseData";
import { coverUrl, formatDateOnly, formatTimeOnly } from "../../lib/format";
import type { Meeting, Member, PollOption } from "../../types/domain";

type MeetingBoardProps = {
  loading: boolean;
  error: string;
  meeting: Meeting | null;
  members: Member[];
  selectedMember?: Member;
  isAdmin: boolean;
};

type DecisionKind = "date" | "book";

const defaultMeeting: Meeting = {
  id: "next",
  title: "Next book club",
  status: "open",
  dateOptions: [],
  bookOptions: [],
  dateVotes: {},
  bookVotes: {},
};

type DateOptionGroup = {
  key: string;
  label: string;
  options: PollOption[];
};

type DecisionSummaryItemProps = {
  icon: ReactNode;
  label: string;
  state: "Finalized" | "Leading" | "Open";
  value: string;
};

function sortedOptions(options: PollOption[]) {
  return [...options].sort((a, b) =>
    (a.startsAt ?? a.label).localeCompare(b.startsAt ?? b.label),
  );
}

function groupDateOptions(options: PollOption[]): DateOptionGroup[] {
  const groups = new Map<string, PollOption[]>();

  sortedOptions(options).forEach((option) => {
    const key = option.startsAt?.slice(0, 10) ?? "other";
    groups.set(key, [...(groups.get(key) ?? []), option]);
  });

  return [...groups.entries()].map(([key, groupOptions]) => ({
    key,
    label:
      key === "other"
        ? "Other times"
        : formatDateOnly(groupOptions[0]?.startsAt ?? `${key}T12:00`),
    options: groupOptions,
  }));
}

function rankedByVotes(
  options: PollOption[],
  votes: Record<string, string[]>,
  members: Member[],
) {
  return [...options].sort((a, b) => {
    const aVotes = members.filter((member) => votes?.[member.id]?.includes(a.id))
      .length;
    const bVotes = members.filter((member) => votes?.[member.id]?.includes(b.id))
      .length;

    return bVotes - aVotes;
  });
}

function countVotes(
  optionId: string,
  votes: Record<string, string[]>,
  members: Member[],
) {
  return members.filter((member) => votes?.[member.id]?.includes(optionId)).length;
}

function leadingOptions(
  options: PollOption[],
  votes: Record<string, string[]>,
  members: Member[],
) {
  const rankedOptions = rankedByVotes(options, votes, members);
  const topVoteCount = rankedOptions[0]
    ? countVotes(rankedOptions[0].id, votes, members)
    : 0;

  if (topVoteCount === 0) {
    return [];
  }

  return rankedOptions.filter(
    (option) => countVotes(option.id, votes, members) === topVoteCount,
  );
}

function formatLeadingLabels(options: PollOption[]) {
  const labels = options.map((option) => option.label);

  if (labels.length <= 2) {
    return labels.join(" and ");
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export function MeetingBoard({
  loading,
  error,
  meeting,
  members,
  selectedMember,
  isAdmin,
}: MeetingBoardProps) {
  const activeMeeting = meeting ?? defaultMeeting;
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const chosenDate = activeMeeting.dateOptions.find(
    (option) => option.id === activeMeeting.chosenDateOptionId,
  );
  const chosenBook = activeMeeting.bookOptions.find(
    (option) => option.id === activeMeeting.chosenBookOptionId,
  );
  const leadingDates = leadingOptions(
    activeMeeting.dateOptions ?? [],
    activeMeeting.dateVotes ?? {},
    members,
  );
  const leadingBooks = leadingOptions(
    activeMeeting.bookOptions ?? [],
    activeMeeting.bookVotes ?? {},
    members,
  );

  async function resetMeeting() {
    await setDoc(
      nextMeetingDoc(),
      {
        title: activeMeeting.title ?? "Next book club",
        status: "open",
        dateOptions: [],
        bookOptions: activeMeeting.bookOptions ?? [],
        dateVotes: {},
        bookVotes: {},
        chosenDateOptionId: "",
        chosenBookOptionId: "",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    setResetConfirmOpen(false);
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Firestore needs attention</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (loading) {
    return <div className="panel">Loading next meeting...</div>;
  }

  return (
    <div className="meeting-stack">
      {!selectedMember && (
        <p className="notice">Choose your member name before voting.</p>
      )}

      {isAdmin && (
        <div className="admin-action-row">
          <span>Admin mode</span>
          <button
            className="quiet-danger compact"
            type="button"
            onClick={() => setResetConfirmOpen(true)}
          >
            <RotateCcw size={16} />
            Reset meeting
          </button>
        </div>
      )}

      {resetConfirmOpen && (
        <ConfirmDialog
          body="This clears meeting times, time votes, book votes, and finalized choices. The current book shortlist stays in place."
          confirmIcon={<RotateCcw size={17} />}
          confirmLabel="Reset meeting"
          title="Reset next meeting?"
          tone="danger"
          onCancel={() => setResetConfirmOpen(false)}
          onConfirm={resetMeeting}
        />
      )}

      <section className="decision-summary" aria-label="Current decisions">
        <DecisionSummaryItem
          icon={<CalendarDays size={18} />}
          label="Time"
          state={chosenDate ? "Finalized" : leadingDates.length ? "Leading" : "Open"}
          value={
            chosenDate?.label ??
            (leadingDates.length
              ? formatLeadingLabels(leadingDates)
              : "No meeting times yet")
          }
        />
        <DecisionSummaryItem
          icon={<BookOpen size={18} />}
          label="Book"
          state={chosenBook ? "Finalized" : leadingBooks.length ? "Leading" : "Open"}
          value={
            chosenBook?.label ??
            (leadingBooks.length ? formatLeadingLabels(leadingBooks) : "No votes yet")
          }
        />
      </section>

      <section className="mobile-vote-actions" aria-label="Voting shortcuts">
        <a href="#meeting-times">
          <CalendarDays size={17} />
          Vote on times
        </a>
        <a href="#book-shortlist">
          <BookOpen size={17} />
          Vote on books
        </a>
      </section>

      <div className="decision-grid">
        <DecisionSection
          kind="date"
          title="Meeting time"
          icon={<CalendarDays size={18} />}
          options={activeMeeting.dateOptions ?? []}
          votes={activeMeeting.dateVotes ?? {}}
          chosenOptionId={activeMeeting.chosenDateOptionId}
          members={members}
          selectedMember={selectedMember}
          isAdmin={isAdmin}
        />
        <DecisionSection
          kind="book"
          title="Book shortlist"
          icon={<BookOpen size={18} />}
          options={activeMeeting.bookOptions ?? []}
          votes={activeMeeting.bookVotes ?? {}}
          chosenOptionId={activeMeeting.chosenBookOptionId}
          members={members}
          selectedMember={selectedMember}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}

function DecisionSummaryItem({
  icon,
  label,
  state,
  value,
}: DecisionSummaryItemProps) {
  return (
    <article className={state === "Finalized" ? "summary-decision done" : "summary-decision"}>
      <span className="summary-decision-icon">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      <span className="summary-decision-state">{state}</span>
    </article>
  );
}

function DecisionSection({
  kind,
  title,
  icon,
  options,
  votes,
  chosenOptionId,
  members,
  selectedMember,
  isAdmin,
}: {
  kind: DecisionKind;
  title: string;
  icon: ReactNode;
  options: PollOption[];
  votes: Record<string, string[]>;
  chosenOptionId?: string;
  members: Member[];
  selectedMember?: Member;
  isAdmin: boolean;
}) {
  const [finalizingOptionId, setFinalizingOptionId] = useState("");
  const [deletingOptionId, setDeletingOptionId] = useState("");
  const selectedVotes = selectedMember ? votes?.[selectedMember.id] ?? [] : [];
  const voteCountByOption = options.reduce<Record<string, number>>(
    (counts, option) => {
      counts[option.id] = members.filter((member) =>
        votes?.[member.id]?.includes(option.id),
      ).length;
      return counts;
    },
    {},
  );
  const missingMembers = members.filter(
    (member) => !(votes?.[member.id]?.length > 0),
  );
  const rankedOptions = [...options].sort(
    (a, b) => (voteCountByOption[b.id] ?? 0) - (voteCountByOption[a.id] ?? 0),
  );
  const topVoteCount = rankedOptions[0]
    ? voteCountByOption[rankedOptions[0].id] ?? 0
    : 0;
  const leadingOptions =
    topVoteCount > 0
      ? rankedOptions.filter(
          (option) => (voteCountByOption[option.id] ?? 0) === topVoteCount,
        )
      : [];
  const finalizingOption = options.find(
    (option) => option.id === finalizingOptionId,
  );
  const deletingOption = options.find((option) => option.id === deletingOptionId);
  const optionField = kind === "date" ? "chosenDateOptionId" : "chosenBookOptionId";
  const votesField = kind === "date" ? "dateVotes" : "bookVotes";
  const optionsField = kind === "date" ? "dateOptions" : "bookOptions";
  const dateGroups = kind === "date" ? groupDateOptions(options) : [];
  const resultOptions = kind === "date" ? rankedOptions.slice(0, 6) : rankedOptions;

  async function toggleVote(optionId: string) {
    if (!selectedMember) {
      return;
    }

    const nextVotes = selectedVotes.includes(optionId)
      ? selectedVotes.filter((id) => id !== optionId)
      : [...selectedVotes, optionId];
    const nextVoteMap = {
      ...votes,
      [selectedMember.id]: nextVotes,
    };

    await setDoc(
      nextMeetingDoc(),
      {
        title: "Next book club",
        status: "open",
        [votesField]: nextVoteMap,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  async function chooseOption(optionId: string) {
    if (!isAdmin) {
      return;
    }

    await setDoc(
      nextMeetingDoc(),
      {
        title: "Next book club",
        status: "open",
        [optionField]: optionId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    setFinalizingOptionId("");
  }

  async function deleteOption(optionId: string) {
    if (!isAdmin) {
      return;
    }

    const nextOptions = options.filter((option) => option.id !== optionId);
    const nextVotes = Object.fromEntries(
      Object.entries(votes).map(([memberId, memberVotes]) => [
        memberId,
        memberVotes.filter((id) => id !== optionId),
      ]),
    );
    const clearsChosen = chosenOptionId === optionId;

    await setDoc(
      nextMeetingDoc(),
      {
        title: "Next book club",
        status: "open",
        [optionsField]: nextOptions,
        [votesField]: nextVotes,
        ...(clearsChosen ? { [optionField]: "" } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    setDeletingOptionId("");
  }

  return (
    <article
      className="decision-card"
      id={kind === "date" ? "meeting-times" : "book-shortlist"}
    >
      <div className="poll-head">
        <div>
          <p className="eyebrow">{kind === "date" ? "Date options" : "Book options"}</p>
          <h2>
            {icon}
            {title}
          </h2>
        </div>
        <span className="badge">{options.length} options</span>
      </div>

      <div className="poll-meta">
        <span className="poll-meta-pill">
          <UserCheck size={16} />
          <span className="poll-meta-label">
            {members.length - missingMembers.length}/{members.length} voted
          </span>
        </span>
        {leadingOptions.length > 0 && (
          <span className="poll-meta-pill leading-meta">
            <Trophy size={16} />
            <span className="poll-meta-label">
              Leading: {formatLeadingLabels(leadingOptions)}
            </span>
          </span>
        )}
      </div>

      {options.length === 0 ? (
        <div className="empty-state compact-empty decision-empty">
          <span className="empty-icon">{icon}</span>
          <div>
            <h2>No {kind === "date" ? "meeting times" : "books"} yet</h2>
            <p>
              Add {kind === "date" ? "time options" : "book options"} from the
              tabs above.
            </p>
          </div>
        </div>
      ) : (
        <>
          {kind === "date" ? (
            <div className="time-board">
              {dateGroups.map((group) => (
                <section className="time-day-card" key={group.key}>
                  <div className="time-day-head">
                    <strong>{group.label}</strong>
                    <span>{group.options.length} times</span>
                  </div>
                  <div className="time-slot-grid">
                    {group.options.map((option) => {
                      const checked = selectedVotes.includes(option.id);
                      const chosen = chosenOptionId === option.id;
                      const count = voteCountByOption[option.id] ?? 0;

                      return (
                        <div
                          className={[
                            "time-slot",
                            checked ? "selected" : "",
                            chosen ? "chosen" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          key={option.id}
                        >
                          <button
                            className="time-slot-vote"
                            type="button"
                            disabled={!selectedMember}
                            onClick={() => toggleVote(option.id)}
                          >
                            <span className="time-slot-time">
                              {option.startsAt
                                ? formatTimeOnly(option.startsAt)
                                : option.label}
                            </span>
                            <span className="time-slot-count">
                              {count}/{members.length}
                            </span>
                            <span className="time-slot-state">
                              {checked ? (
                                <CheckCircle2 size={17} />
                              ) : (
                                <Plus size={17} />
                              )}
                            </span>
                          </button>
                          {isAdmin && (
                            <div className="time-slot-admin">
                              <button
                                className="text-action"
                                type="button"
                                onClick={() => setFinalizingOptionId(option.id)}
                              >
                                Finalize
                              </button>
                              <button
                                className="icon-button danger"
                                type="button"
                                title="Delete time"
                                onClick={() => setDeletingOptionId(option.id)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="option-grid book-options">
              {options.map((option) => {
                const checked = selectedVotes.includes(option.id);
                const chosen = chosenOptionId === option.id;

                return (
                  <div className={chosen ? "option chosen" : "option"} key={option.id}>
                    <button
                      className={checked ? "vote-option selected" : "vote-option"}
                      type="button"
                      disabled={!selectedMember}
                      onClick={() => toggleVote(option.id)}
                    >
                      <BookCover
                        coverId={option.coverId}
                        src={option.coverUrl}
                        title={option.label}
                      />
                      <span className="option-copy">
                        <strong>{option.label}</strong>
                        {option.authors?.length ? (
                          <small>{option.authors.join(", ")}</small>
                        ) : null}
                        {option.firstPublishYear ? (
                          <small>{option.firstPublishYear}</small>
                        ) : null}
                      </span>
                      <span className="vote-state">
                        {checked ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                        {checked ? "Selected" : "Select"}
                      </span>
                    </button>
                    <div className="option-actions">
                      <span>{voteCountByOption[option.id] ?? 0} votes</span>
                      {isAdmin && (
                        <button
                          className="icon-button danger"
                          type="button"
                          title="Delete option"
                          onClick={() => setDeletingOptionId(option.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="results">
            <div className="section-title">
              <h3>{kind === "date" ? "Best times" : "Results"}</h3>
              <span>
                {isAdmin
                  ? "Finalize when the group has decided"
                  : "Admin finalizes decisions"}
              </span>
            </div>
            {resultOptions.map((option) => (
              <div className="result-row" key={option.id}>
                <span>{option.label}</span>
                <div className="result-track">
                  <span
                    style={{
                      width: `${((voteCountByOption[option.id] ?? 0) / Math.max(members.length, 1)) * 100}%`,
                    }}
                  />
                </div>
                <strong>{voteCountByOption[option.id] ?? 0}</strong>
                {isAdmin && (
                  <button
                    className="text-action"
                    type="button"
                    onClick={() => setFinalizingOptionId(option.id)}
                  >
                    Finalize
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {finalizingOption && (
        <ConfirmDialog
          body={finalizingOption.label}
          confirmLabel="Confirm"
          title={`Set as the ${kind === "date" ? "meeting time" : "book"}?`}
          onCancel={() => setFinalizingOptionId("")}
          onConfirm={() => chooseOption(finalizingOption.id)}
        />
      )}

      {deletingOption && (
        <ConfirmDialog
          body={deletingOption.label}
          confirmLabel="Delete"
          title={`Delete this ${kind === "date" ? "time" : "book"}?`}
          tone="danger"
          onCancel={() => setDeletingOptionId("")}
          onConfirm={() => deleteOption(deletingOption.id)}
        />
      )}

      <footer className="poll-footer">
        <span>
          Waiting on{" "}
          {missingMembers.length > 0
            ? missingMembers.map((member) => member.name).join(", ")
            : "no one"}
        </span>
      </footer>
    </article>
  );
}

function ConfirmDialog({
  body,
  confirmIcon,
  confirmLabel,
  title,
  tone = "default",
  onCancel,
  onConfirm,
}: {
  body: string;
  confirmIcon?: ReactNode;
  confirmLabel: string;
  title: string;
  tone?: "default" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="confirm-modal"
        role="dialog"
      >
        <div>
          <p className="eyebrow">{tone === "danger" ? "Confirm change" : "Confirm choice"}</p>
          <h2 id="confirm-dialog-title">{title}</h2>
          <p>{body}</p>
        </div>
        <div className="modal-actions">
          <button className="ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={tone === "danger" ? "primary danger-button" : "primary"}
            type="button"
            onClick={onConfirm}
          >
            {confirmIcon ?? (tone === "danger" ? <Trash2 size={17} /> : <Check size={17} />)}
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function BookCover({
  coverId,
  src,
  title,
}: {
  coverId?: number;
  src?: string;
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  const imageSrc = !failed ? src ?? coverUrl(coverId) : undefined;

  if (!imageSrc) {
    return (
      <span className="cover cover-placeholder" aria-label={`No cover for ${title}`}>
        <BookOpen size={24} />
      </span>
    );
  }

  return (
    <img
      className="cover"
      alt=""
      loading="lazy"
      src={imageSrc}
      onError={() => setFailed(true)}
    />
  );
}
