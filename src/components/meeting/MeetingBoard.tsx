import { useState, type ReactNode } from "react";
import { serverTimestamp, setDoc } from "firebase/firestore";
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Plus,
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
}: MeetingBoardProps) {
  const activeMeeting = meeting ?? defaultMeeting;

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
      <section className="meeting-hero poll-card">
        <div>
          <p className="eyebrow">Ongoing decision room</p>
          <h2>{activeMeeting.title}</h2>
        </div>
        <span className="badge">{activeMeeting.status}</span>
      </section>

      {!selectedMember && (
        <p className="notice">Choose your member name before voting.</p>
      )}

      <DecisionSection
        kind="date"
        title="Meeting time"
        icon={<CalendarDays size={18} />}
        options={activeMeeting.dateOptions ?? []}
        votes={activeMeeting.dateVotes ?? {}}
        chosenOptionId={activeMeeting.chosenDateOptionId}
        members={members}
        selectedMember={selectedMember}
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
      />
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
}: {
  kind: DecisionKind;
  title: string;
  icon: ReactNode;
  options: PollOption[];
  votes: Record<string, string[]>;
  chosenOptionId?: string;
  members: Member[];
  selectedMember?: Member;
}) {
  const [finalizingOptionId, setFinalizingOptionId] = useState("");
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
  const optionField = kind === "date" ? "chosenDateOptionId" : "chosenBookOptionId";
  const votesField = kind === "date" ? "dateVotes" : "bookVotes";

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

  return (
    <article className="poll-card decision-card">
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
                  </div>
                </div>
              );
            })}
          </div>

          <div className="results">
            <div className="section-title">
              <h3>Results</h3>
              <span>Finalize when the group has decided</span>
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
                <button
                  className="text-action"
                  type="button"
                  onClick={() => setFinalizingOptionId(option.id)}
                >
                  Finalize
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {finalizingOption && (
        <div className="finalize-panel">
          <div>
            <strong>Set as the {kind === "date" ? "meeting time" : "book"}?</strong>
            <span>{finalizingOption.label}</span>
          </div>
          <div className="finalize-actions">
            <button
              className="ghost compact"
              type="button"
              onClick={() => setFinalizingOptionId("")}
            >
              Cancel
            </button>
            <button
              className="primary compact"
              type="button"
              onClick={() => chooseOption(finalizingOption.id)}
            >
              <Check size={17} />
              Confirm
            </button>
          </div>
        </div>
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
