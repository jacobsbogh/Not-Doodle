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

  const appNavigation = (className: string, ariaLabel: string) => (
    <nav className={className} aria-label={ariaLabel} data-active-view={view}>
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
  );

  return (
    <Shell
      action={
        <div className="hero-actions">
          <AdminToolsPanel
            unlocked={adminUnlocked}
            onLock={lockAdmin}
            onUnlock={unlockAdmin}
          />
          <button
            aria-label="Sign out"
            className="ghost signout-button"
            type="button"
            onClick={() => signOut(getAuthInstance())}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      }
    >
      <section className="toolbar">
        <label className="member-select">
          <span>Voting as</span>
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
        {appNavigation("tabs toolbar-tabs", "App sections")}
      </section>

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
        <DatePollForm
          isAdmin={adminUnlocked}
          meeting={meeting}
          onDone={() => setView("meeting")}
        />
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

      {appNavigation("mobile-tabbar", "Primary sections")}
    </Shell>
  );
}
