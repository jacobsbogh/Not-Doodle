import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  Archive,
  BookOpen,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  Plus,
  Search,
  Trash2,
  Trophy,
  UserCheck,
  Users,
  Vote,
  X,
} from "lucide-react";
import { auth, db, missingFirebaseConfig } from "./firebase";

type Member = {
  id: string;
  name: string;
  active: boolean;
};

type PollType = "date" | "book";
type PollStatus = "open" | "closed";

type PollOption = {
  id: string;
  label: string;
  startsAt?: string;
  openLibraryKey?: string;
  title?: string;
  authors?: string[];
  firstPublishYear?: number;
  coverId?: number;
};

type Poll = {
  id: string;
  type: PollType;
  title: string;
  status: PollStatus;
  options: PollOption[];
  votes: Record<string, string[]>;
  chosenOptionId?: string;
};

type BookResult = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
};

type View = "polls" | "date" | "book" | "members";

function makeId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function getAuthInstance() {
  if (!auth) {
    throw new Error("Firebase Auth is not configured.");
  }

  return auth;
}

function getDb() {
  if (!db) {
    throw new Error("Firestore is not configured.");
  }

  return db;
}

function membersCollection() {
  return collection(getDb(), "members");
}

function pollsCollection() {
  return collection(getDb(), "polls");
}

function coverUrl(coverId?: number) {
  return coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
    : undefined;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatTimeOnly(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(getAuthInstance(), (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}

function useCollectionData<T extends { id: string }>(
  collectionName: "members" | "polls",
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ref =
      collectionName === "members" ? membersCollection() : pollsCollection();
    const q =
      collectionName === "polls"
        ? query(ref, orderBy("createdAt", "desc"))
        : query(ref, orderBy("name"));

    return onSnapshot(
      q,
      (snapshot) => {
        setItems(
          snapshot.docs.map(
            (item) =>
              ({
                id: item.id,
                ...item.data(),
              }) as T,
          ),
        );
        setError("");
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [collectionName]);

  return { items, loading, error };
}

export function App() {
  if (missingFirebaseConfig.length > 0) {
    return <MissingConfig />;
  }

  return <ConfiguredApp />;
}

function ConfiguredApp() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <Shell>Loading...</Shell>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <BookClubApp />;
}

function MissingConfig() {
  return (
    <Shell>
      <div className="empty-state">
        <h2>Firebase config is missing</h2>
        <p>
          Copy <code>.env.example</code> to <code>.env.local</code>, fill in the
          Firebase web app values, and restart the dev server.
        </p>
        <pre>{missingFirebaseConfig.join("\n")}</pre>
      </div>
    </Shell>
  );
}

function Shell({
  action,
  children,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="app-shell">
      <header className="hero">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            ND
          </span>
          <div>
            <p className="eyebrow">Not Doodle</p>
          </div>
        </div>
        {action}
      </header>
      {children}
    </main>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await signInWithEmailAndPassword(getAuthInstance(), email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <form className="panel login-panel" onSubmit={handleLogin}>
        <label>
          Email
          <input
            autoComplete="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit" disabled={busy}>
          <LogIn size={18} />
          {busy ? "Signing in" : "Sign in"}
        </button>
      </form>
    </Shell>
  );
}

function BookClubApp() {
  const [view, setView] = useState<View>("polls");
  const [selectedMemberId, setSelectedMemberId] = useState(
    localStorage.getItem("bookClubMemberId") ?? "",
  );
  const {
    items: members,
    loading: membersLoading,
    error: membersError,
  } = useCollectionData<Member>("members");
  const {
    items: polls,
    loading: pollsLoading,
    error: pollsError,
  } = useCollectionData<Poll>("polls");
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
          <Tab active={view === "polls"} onClick={() => setView("polls")}>
            <Vote size={17} />
            Polls
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
          <span>Open polls</span>
          <strong>{polls.filter((poll) => poll.status !== "closed").length}</strong>
        </div>
        <div className="metric">
          <span>Members</span>
          <strong>{activeMembers.length}</strong>
        </div>
        <div className="metric">
          <span>Voting as</span>
          <strong>{selectedMember?.name ?? "Not set"}</strong>
        </div>
      </section>

      {view === "polls" && (
        <PollList
          loading={pollsLoading || membersLoading}
          error={pollsError || membersError}
          polls={polls}
          members={activeMembers}
          selectedMember={selectedMember}
        />
      )}
      {view === "date" && <DatePollForm onDone={() => setView("polls")} />}
      {view === "book" && <BookPollForm onDone={() => setView("polls")} />}
      {view === "members" && (
        <MemberManager members={members} onPick={setSelectedMemberId} />
      )}
    </Shell>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={active ? "tab active" : "tab"}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PollList({
  loading,
  error,
  polls,
  members,
  selectedMember,
}: {
  loading: boolean;
  error: string;
  polls: Poll[];
  members: Member[];
  selectedMember?: Member;
}) {
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

function PollCard({
  poll,
  members,
  selectedMember,
}: {
  poll: Poll;
  members: Member[];
  selectedMember?: Member;
}) {
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

function DatePollForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("Next meeting");
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

  async function createPoll(event: FormEvent) {
    event.preventDefault();
    const options = dates
      .filter(Boolean)
      .map((startsAt) => ({
        id: makeId(),
        label: formatDateTime(startsAt),
        startsAt,
      }));

    if (options.length === 0) {
      return;
    }

    setBusy(true);
    await addDoc(pollsCollection(), {
      type: "date",
      title,
      status: "open",
      options,
      votes: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setBusy(false);
    onDone();
  }

  return (
    <section className="composer">
      <div className="composer-head">
        <div>
          <p className="eyebrow">Meeting poll</p>
          <h2>Create date poll</h2>
        </div>
        <button className="ghost compact" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
      <label>
        Poll title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </label>

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
          <p className="notice">Add at least one possible meeting time.</p>
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

      <form onSubmit={createPoll}>
        <button className="primary wide" type="submit" disabled={busy || dates.length === 0}>
          <CalendarPlus size={18} />
          Create poll with {dates.length} options
        </button>
      </form>
    </section>
  );
}

function BookPollForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("Next book");
  const [queryText, setQueryText] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualYear, setManualYear] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [selected, setSelected] = useState<PollOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  async function searchBooks(event: FormEvent) {
    event.preventDefault();
    setSearching(true);
    setError("");

    try {
      const params = new URLSearchParams({
        q: queryText,
        limit: "12",
        fields: "key,title,author_name,first_publish_year,cover_i",
      });
      const response = await fetch(`https://openlibrary.org/search.json?${params}`);

      if (!response.ok) {
        throw new Error("Open Library search failed.");
      }

      const payload = (await response.json()) as { docs: BookResult[] };
      setResults(payload.docs ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. You can add the book manually below.`
          : "Could not search books. You can add the book manually below.",
      );
    } finally {
      setSearching(false);
    }
  }

  function toggleBook(book: BookResult) {
    const existing = selected.find((option) => option.openLibraryKey === book.key);

    if (existing) {
      setSelected((current) =>
        current.filter((option) => option.openLibraryKey !== book.key),
      );
      return;
    }

    setSelected((current) => [
      ...current,
      {
        id: makeId(),
        label: book.title,
        title: book.title,
        authors: book.author_name?.slice(0, 3) ?? [],
        firstPublishYear: book.first_publish_year,
        coverId: book.cover_i,
        openLibraryKey: book.key,
      },
    ]);
  }

  function addManualBook(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = manualTitle.trim();

    if (!trimmedTitle) {
      return;
    }

    setSelected((current) => [
      ...current,
      {
        id: makeId(),
        label: trimmedTitle,
        title: trimmedTitle,
        authors: manualAuthor
          .split(",")
          .map((author) => author.trim())
          .filter(Boolean),
        firstPublishYear: manualYear ? Number(manualYear) : undefined,
      },
    ]);
    setManualTitle("");
    setManualAuthor("");
    setManualYear("");
  }

  async function createPoll(event: FormEvent) {
    event.preventDefault();

    if (selected.length === 0) {
      return;
    }

    setBusy(true);
    await addDoc(pollsCollection(), {
      type: "book",
      title,
      status: "open",
      options: selected,
      votes: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setBusy(false);
    onDone();
  }

  return (
    <section className="composer">
      <div className="composer-head">
        <div>
          <p className="eyebrow">Book poll</p>
          <h2>Build a shortlist</h2>
        </div>
        <button className="ghost compact" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
      <label>
        Poll title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </label>

      <form className="search-row elevated-search" onSubmit={searchBooks}>
        <label>
          Search Open Library
          <input
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder="Title, author, or ISBN"
            required
          />
        </label>
        <button className="primary" type="submit" disabled={searching}>
          <Search size={18} />
          {searching ? "Searching" : "Search"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {selected.length > 0 && (
        <div className="shortlist">
          <div className="section-title">
            <h3>Shortlist</h3>
            <span>{selected.length} selected</span>
          </div>
          <div className="selected-books">
            {selected.map((book) => (
              <button
                className="chip"
                key={book.id}
                type="button"
                onClick={() =>
                  setSelected((current) =>
                    current.filter((option) => option.id !== book.id),
                  )
                }
              >
                {book.coverId && <img alt="" src={coverUrl(book.coverId)} />}
                <span>{book.label}</span>
                <X size={15} />
              </button>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <div className="section-title">
            <h3>Search results</h3>
            <span>Click books to add or remove</span>
          </div>
          <div className="book-grid">
            {results.map((book) => {
              const picked = selected.some(
                (option) => option.openLibraryKey === book.key,
              );

              return (
                <button
                  className={picked ? "book-result picked" : "book-result"}
                  key={book.key}
                  type="button"
                  onClick={() => toggleBook(book)}
                >
                  {book.cover_i ? (
                    <img alt="" src={coverUrl(book.cover_i)} loading="lazy" />
                  ) : (
                    <span className="cover-placeholder">
                      <BookOpen size={24} />
                    </span>
                  )}
                  <span>
                    <strong>{book.title}</strong>
                    {book.author_name?.length ? (
                      <small>{book.author_name.slice(0, 2).join(", ")}</small>
                    ) : null}
                    {book.first_publish_year ? (
                      <small>{book.first_publish_year}</small>
                    ) : null}
                  </span>
                  <span className="pick-indicator">
                    {picked ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                    {picked ? "Added" : "Add"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form className="manual-book" onSubmit={addManualBook}>
        <div className="section-title">
          <h3>Add manually</h3>
          <span>For blocked search or missing books</span>
        </div>
        <div className="manual-book-grid">
          <label>
            Title
            <input
              value={manualTitle}
              onChange={(event) => setManualTitle(event.target.value)}
              placeholder="Song of Solomon"
              required
            />
          </label>
          <label>
            Author
            <input
              value={manualAuthor}
              onChange={(event) => setManualAuthor(event.target.value)}
              placeholder="Toni Morrison"
            />
          </label>
          <label>
            Year
            <input
              min="0"
              type="number"
              value={manualYear}
              onChange={(event) => setManualYear(event.target.value)}
              placeholder="1977"
            />
          </label>
        </div>
        <button className="secondary" type="submit">
          <Plus size={18} />
          Add book
        </button>
      </form>

      <form onSubmit={createPoll}>
        <button className="primary wide" type="submit" disabled={busy || selected.length === 0}>
          <BookOpen size={18} />
          Create poll with {selected.length} books
        </button>
      </form>
    </section>
  );
}

function MemberManager({
  members,
  onPick,
}: {
  members: Member[];
  onPick: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const activeMembers = members.filter((member) => member.active !== false);
  const inactiveMembers = members.filter((member) => member.active === false);

  async function addMember(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      return;
    }

    const existingInactive = inactiveMembers.find(
      (member) => member.name.toLowerCase() === trimmed.toLowerCase(),
    );

    if (existingInactive) {
      await updateDoc(doc(getDb(), "members", existingInactive.id), {
        active: true,
        updatedAt: serverTimestamp(),
      });
      onPick(existingInactive.id);
    } else {
      const created = await addDoc(membersCollection(), {
        name: trimmed,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onPick(created.id);
    }

    setName("");
  }

  async function deactivate(member: Member) {
    await updateDoc(doc(getDb(), "members", member.id), {
      active: false,
      updatedAt: serverTimestamp(),
    });
  }

  return (
    <section className="panel form-stack">
      <h2>Members</h2>
      <form className="search-row" onSubmit={addMember}>
        <label>
          Add member
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            required
          />
        </label>
        <button className="primary" type="submit">
          <Plus size={18} />
          Add
        </button>
      </form>

      <div className="member-list">
        {activeMembers.map((member) => (
          <div className="member-row" key={member.id}>
            <button className="text-button" type="button" onClick={() => onPick(member.id)}>
              {member.name}
            </button>
            <button
              className="icon-button danger"
              type="button"
              title="Remove member"
              onClick={() => deactivate(member)}
            >
              <X size={17} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
