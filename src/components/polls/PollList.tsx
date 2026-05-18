import { Archive } from "lucide-react";
import type { Member, Poll } from "../../types/domain";
import { PollCard } from "./PollCard";

type PollListProps = {
  loading: boolean;
  error: string;
  polls: Poll[];
  members: Member[];
  selectedMember?: Member;
};

export function PollList({
  loading,
  error,
  polls,
  members,
  selectedMember,
}: PollListProps) {
  if (error) {
    return (
      <div className="empty-state">
        <h2>Firestore needs attention</h2>
        <p>{error}</p>
      </div>
    );
  }

  const openPolls = polls.filter((poll) => poll.status !== "closed");
  const closedPolls = polls.filter((poll) => poll.status === "closed");

  if (loading) {
    return <div className="panel">Loading polls...</div>;
  }

  if (polls.length === 0) {
    return (
      <div className="empty-state">
        <h2>No polls yet</h2>
        <p>Create a date poll or search for books to start the first vote.</p>
      </div>
    );
  }

  return (
    <div className="poll-stack">
      {openPolls.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          members={members}
          selectedMember={selectedMember}
        />
      ))}
      {closedPolls.length > 0 && (
        <>
          <h2 className="section-heading">
            <Archive size={18} />
            Closed
          </h2>
          {closedPolls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              members={members}
              selectedMember={selectedMember}
            />
          ))}
        </>
      )}
    </div>
  );
}
