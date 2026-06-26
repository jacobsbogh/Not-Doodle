import { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { BookOpen, CalendarPlus, LogOut, Users, Vote } from "lucide-react";
import { useCollectionData } from "../hooks/useCollectionData";
import { useNextMeeting } from "../hooks/useNextMeeting";
import { getAuthInstance } from "../lib/firebaseData";
import type { Member, View } from "../types/domain";
import { AdminToolsPanel } from "./AdminToolsPanel";
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
  const [adminUnlocked, setAdminUnlocked] = useState(
    sessionStorage.getItem("notDoodleAdminUnlocked") === "true",
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

  function unlockAdmin() {
    sessionStorage.setItem("notDoodleAdminUnlocked", "true");
    setAdminUnlocked(true);
  }

  function lockAdmin() {
    sessionStorage.removeItem("notDoodleAdminUnlocked");
    setAdminUnlocked(false);
  }

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
            Overview
          </Tab>
          <Tab active={view === "date"} onClick={() => setView("date")}>
            <CalendarPlus size={17} />
            Times
          </Tab>
          <Tab active={view === "book"} onClick={() => setView("book")}>
            <BookOpen size={17} />
            Books
          </Tab>
          <Tab active={view === "members"} onClick={() => setView("members")}>
            <Users size={17} />
            People
          </Tab>
        </nav>
      </section>

      <section className="meeting-summary" aria-label="Next meeting summary">
        <div>
          <p className="eyebrow">Next meeting</p>
          <h2>{meeting?.title ?? "Next book club"}</h2>
        </div>
        <div className="summary-counts" aria-label="Current options">
          <span>{meeting?.dateOptions?.length ?? 0} times</span>
          <span>{meeting?.bookOptions?.length ?? 0} books</span>
          <span>{activeMembers.length} people</span>
        </div>
        <div className="summary-actions">
          <button className="secondary compact" type="button" onClick={() => setView("date")}>
            <CalendarPlus size={17} />
            Add time
          </button>
          <button className="primary compact" type="button" onClick={() => setView("book")}>
            <BookOpen size={17} />
            Add book
          </button>
        </div>
      </section>

      <AdminToolsPanel
        unlocked={adminUnlocked}
        onLock={lockAdmin}
        onUnlock={unlockAdmin}
      />

      {view === "meeting" && (
        <MeetingBoard
          loading={meetingLoading || membersLoading}
          error={meetingError || membersError}
          meeting={meeting}
          members={activeMembers}
          selectedMember={selectedMember}
          isAdmin={adminUnlocked}
        />
      )}
      {view === "date" && (
        <DatePollForm meeting={meeting} onDone={() => setView("meeting")} />
      )}
      {view === "book" && (
        <BookPollForm meeting={meeting} onDone={() => setView("meeting")} />
      )}
      {view === "members" && (
        <MemberManager
          adminUnlocked={adminUnlocked}
          members={members}
          onPick={setSelectedMemberId}
        />
      )}
    </Shell>
  );
}
