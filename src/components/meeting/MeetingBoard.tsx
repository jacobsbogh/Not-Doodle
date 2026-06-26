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
import { AdminUnlockPanel } from "../AdminUnlockPanel";

type MeetingBoardProps = {
  loading: boolean;
  error: string;
  meeting: Meeting | null;
  members: Member[];
  selectedMember?: Member;
  isAdmin: boolean;
  adminUnlocked: boolean;
  onUnlockAdmin: () => void;
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

export function MeetingBoard({
  loading,
  error,
  meeting,
  members,
  selectedMember,
  isAdmin,
  adminUnlocked,
  onUnlockAdmin,
}: MeetingBoardProps) {
  const activeMeeting = meeting ?? defaultMeeting;
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

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
        <div className="admin-strip">
          <span>Admin tools</span>
          <button
            className="ghost compact danger-text"
            type="button"
            onClick={() => setResetConfirmOpen(true)}
          >
            <RotateCcw size={16} />
            Reset meeting
          </button>
        </div>
      )}

      {selectedMember?.admin && !adminUnlocked && (
        <div className="admin-strip admin-strip-unlock">
          <div className="admin-strip-copy">
            <span>Admin tools locked</span>
            <small>Unlock to reset the meeting, delete options, or finalize.</small>
          </div>
          <AdminUnlockPanel onUnlock={onUnlockAdmin} />
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
  const finalizingOption = options.find(
    (option) => option.id === finalizingOptionId,
  );
  const deletingOption = options.find((option) => option.id === deletingOptionId);
  const optionField = kind === "date" ? "chosenDateOptionId" : "chosenBookOptionId";
  const votesField = kind === "date" ? "dateVotes" : "bookVotes";
  const optionsField = kind === "date" ? "dateOptions" : "bookOptions";

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
    <article className="decision-card">
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
        <span>
          <UserCheck size={16} />
          {members.length - missingMembers.length}/{members.length} voted
        </span>
        {rankedOptions[0] && (
          <span>
            <Trophy size={16} />
            Leading: {rankedOptions[0].label}
          </span>
        )}
      </div>

      {options.length === 0 ? (
        <div className="empty-state compact-empty">
          <h2>No {kind === "date" ? "meeting times" : "books"} yet</h2>
          <p>
            Add {kind === "date" ? "date options" : "book options"} from the tabs
            above.
          </p>
        </div>
      ) : (
        <>
          <div className={kind === "book" ? "option-grid book-options" : "option-grid"}>
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
                    {kind === "book" && (
                      <BookCover
                        coverId={option.coverId}
                        src={option.coverUrl}
                        title={option.label}
                      />
                    )}
                    {kind === "date" && option.startsAt && (
                      <span className="date-tile">
                        <span>{formatDateOnly(option.startsAt)}</span>
                        <strong>{formatTimeOnly(option.startsAt)}</strong>
                      </span>
                    )}
                    <span className="option-copy">
                      {kind === "book" && <strong>{option.label}</strong>}
                      {option.authors?.length ? (
                        <small>{option.authors.join(", ")}</small>
                      ) : null}
                      {option.firstPublishYear ? <small>{option.firstPublishYear}</small> : null}
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

          <div className="results">
            <div className="section-title">
              <h3>Results</h3>
              {isAdmin ? (
                <span>Finalize when the group has decided</span>
              ) : (
                <span>Admin finalizes decisions</span>
              )}
            </div>
            {rankedOptions.map((option) => (
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
