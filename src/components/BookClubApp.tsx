import { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { BookOpen, CalendarPlus, LogOut, Users, Vote } from "lucide-react";
import { useCollectionData } from "../hooks/useCollectionData";
import { useNextMeeting } from "../hooks/useNextMeeting";
import { getAuthInstance } from "../lib/firebaseData";
import type { Member, View } from "../types/domain";
import { BookPollForm } from "./forms/BookPollForm";
import { DatePollForm } from "./forms/DatePollForm";
import { MemberManager } from "./forms/MemberManager";
import { MeetingBoard } from "./meeting/MeetingBoard";
import { Shell } from "./Shell";
import { Tab } from "./Tab";

export function BookClubApp() {
  const [view, setView] = useState<View>("meeting");
  const [selectedMemberId, setSelectedMemberId] = useState(
    localStorage.getItem("bookClubMemberId") ?? "",
  );
  const {
    items: members,
    loading: membersLoading,
    error: membersError,
  } = useCollectionData<Member>("members");
  const {
    meeting,
    loading: meetingLoading,
    error: meetingError,
  } = useNextMeeting();
  const activeMembers = useMemo(
    () => members.filter((member) => member.active !== false),
    [members],
  );
  const selectedMember = activeMembers.find(
    (member) => member.id === selectedMemberId,
  );

  useEffect(() => {
    if (selectedMemberId) {
      localStorage.setItem("bookClubMemberId", selectedMemberId);
    }
  }, [selectedMemberId]);

  useEffect(() => {
    if (selectedMemberId && !selectedMember && activeMembers.length > 0) {
      setSelectedMemberId("");
      localStorage.removeItem("bookClubMemberId");
    }
  }, [activeMembers.length, selectedMember, selectedMemberId]);

  return (
    <Shell
      action={
        <button
          className="ghost"
          type="button"
          onClick={() => signOut(getAuthInstance())}
        >
          <LogOut size={18} />
          Sign out
        </button>
      }
    >
      <section className="toolbar">
        <label className="member-select">
          Voting as
          <select
            value={selectedMemberId}
            onChange={(event) => setSelectedMemberId(event.target.value)}
          >
            <option value="">Choose member</option>
            {activeMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <nav className="tabs" aria-label="App sections">
          <Tab active={view === "meeting"} onClick={() => setView("meeting")}>
            <Vote size={17} />
            Meeting
          </Tab>
          <Tab active={view === "date"} onClick={() => setView("date")}>
            <CalendarPlus size={17} />
            Date
          </Tab>
          <Tab active={view === "book"} onClick={() => setView("book")}>
            <BookOpen size={17} />
            Book
          </Tab>
          <Tab active={view === "members"} onClick={() => setView("members")}>
            <Users size={17} />
            Members
          </Tab>
        </nav>
      </section>

      <section className="overview-grid" aria-label="Book club overview">
        <div className="metric">
          <span>Date options</span>
          <strong>{meeting?.dateOptions?.length ?? 0}</strong>
        </div>
        <div className="metric">
          <span>Book options</span>
          <strong>{meeting?.bookOptions?.length ?? 0}</strong>
        </div>
        <div className="metric">
          <span>Members</span>
          <strong>{activeMembers.length}</strong>
        </div>
      </section>

      {view === "meeting" && (
        <MeetingBoard
          loading={meetingLoading || membersLoading}
          error={meetingError || membersError}
          meeting={meeting}
          members={activeMembers}
          selectedMember={selectedMember}
        />
      )}
      {view === "date" && (
        <DatePollForm meeting={meeting} onDone={() => setView("meeting")} />
      )}
      {view === "book" && (
        <BookPollForm meeting={meeting} onDone={() => setView("meeting")} />
      )}
      {view === "members" && (
        <MemberManager members={members} onPick={setSelectedMemberId} />
      )}
    </Shell>
  );
}
