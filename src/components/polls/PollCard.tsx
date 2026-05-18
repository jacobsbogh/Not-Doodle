import { useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Check, CheckCircle2, Plus, Trophy, UserCheck } from "lucide-react";
import { getDb } from "../../lib/firebaseData";
import { coverUrl, formatDateOnly, formatTimeOnly } from "../../lib/format";
import type { Member, Poll } from "../../types/domain";

type PollCardProps = {
  poll: Poll;
  members: Member[];
  selectedMember?: Member;
};

export function PollCard({ poll, members, selectedMember }: PollCardProps) {
  const [finalizingOptionId, setFinalizingOptionId] = useState("");
  const selectedVotes = selectedMember ? poll.votes?.[selectedMember.id] ?? [] : [];
  const voteCountByOption = poll.options.reduce<Record<string, number>>(
    (counts, option) => {
      counts[option.id] = members.filter((member) =>
        poll.votes?.[member.id]?.includes(option.id),
      ).length;
      return counts;
    },
    {},
  );
  const missingMembers = members.filter(
    (member) => !(poll.votes?.[member.id]?.length > 0),
  );
  const rankedOptions = [...poll.options].sort(
    (a, b) => (voteCountByOption[b.id] ?? 0) - (voteCountByOption[a.id] ?? 0),
  );

  async function toggleVote(optionId: string) {
    if (!selectedMember || poll.status === "closed") {
      return;
    }

    const nextVotes = selectedVotes.includes(optionId)
      ? selectedVotes.filter((id) => id !== optionId)
      : [...selectedVotes, optionId];

    await updateDoc(doc(getDb(), "polls", poll.id), {
      [`votes.${selectedMember.id}`]: nextVotes,
      updatedAt: serverTimestamp(),
    });
  }

  async function chooseOption(optionId: string) {
    await updateDoc(doc(getDb(), "polls", poll.id), {
      chosenOptionId: optionId,
      status: "closed",
      updatedAt: serverTimestamp(),
    });
  }

  async function reopenPoll() {
    await updateDoc(doc(getDb(), "polls", poll.id), {
      chosenOptionId: "",
      status: "open",
      updatedAt: serverTimestamp(),
    });
  }

  const finalizingOption = poll.options.find(
    (option) => option.id === finalizingOptionId,
  );

  return (
    <article className="poll-card">
      <div className="poll-head">
        <div>
          <p className="eyebrow">{poll.type === "book" ? "Book poll" : "Date poll"}</p>
          <h2>{poll.title}</h2>
        </div>
        <span className={poll.status === "closed" ? "badge closed" : "badge"}>
          {poll.status}
        </span>
      </div>

      {!selectedMember && poll.status !== "closed" && (
        <p className="notice">Choose your member name before voting.</p>
      )}

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

      <div className={poll.type === "book" ? "option-grid book-options" : "option-grid"}>
        {poll.options.map((option) => {
          const checked = selectedVotes.includes(option.id);
          const chosen = poll.chosenOptionId === option.id;

          return (
            <div className={chosen ? "option chosen" : "option"} key={option.id}>
              <button
                className={checked ? "vote-option selected" : "vote-option"}
                type="button"
                disabled={!selectedMember || poll.status === "closed"}
                onClick={() => toggleVote(option.id)}
              >
                {option.coverId && (
                  <img
                    className="cover"
                    alt=""
                    loading="lazy"
                    src={coverUrl(option.coverId)}
                  />
                )}
                {poll.type === "date" && option.startsAt && (
                  <span className="date-tile">
                    <span>{formatDateOnly(option.startsAt)}</span>
                    <strong>{formatTimeOnly(option.startsAt)}</strong>
                  </span>
                )}
                <span className="option-copy">
                  {poll.type === "book" && <strong>{option.label}</strong>}
                  {option.authors?.length ? <small>{option.authors.join(", ")}</small> : null}
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
          {poll.status !== "closed" && (
            <span>Finalize from here when the group has decided</span>
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
            {poll.status !== "closed" && (
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

      {finalizingOption && (
        <div className="finalize-panel">
          <div>
            <strong>Close this poll?</strong>
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
              Close poll
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
        {poll.status === "closed" && (
          <button className="ghost compact" type="button" onClick={reopenPoll}>
            Reopen
          </button>
        )}
      </footer>
    </article>
  );
}
