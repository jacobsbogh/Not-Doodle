import { FormEvent, useState } from "react";
import { serverTimestamp, setDoc } from "firebase/firestore";
import { BookOpen, CheckCircle2, Plus, Search, X } from "lucide-react";
import { nextMeetingDoc } from "../../lib/firebaseData";
import { coverUrl, makeId } from "../../lib/format";
import type { BookResult, Meeting, PollOption } from "../../types/domain";

type BookPollFormProps = {
  meeting: Meeting | null;
  onDone: () => void;
};

export function BookPollForm({ meeting, onDone }: BookPollFormProps) {
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
        coverUrl: coverUrl(book.cover_i),
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

  async function addToMeeting(event: FormEvent) {
    event.preventDefault();

    if (selected.length === 0) {
      return;
    }

    const existingOptions = meeting?.bookOptions ?? [];
    const existingKeys = new Set(
      existingOptions
        .map((option) => option.openLibraryKey ?? option.label.toLowerCase())
        .filter(Boolean),
    );
    const nextOptions = [
      ...existingOptions,
      ...selected.filter(
        (option) =>
          !existingKeys.has(option.openLibraryKey ?? option.label.toLowerCase()),
      ),
    ];

    setBusy(true);
    await setDoc(
      nextMeetingDoc(),
      {
        title: meeting?.title ?? "Next book club",
        dateOptions: meeting?.dateOptions ?? [],
        bookOptions: nextOptions,
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
          <h2>Add book options</h2>
        </div>
        <button className="ghost compact" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>

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
                {book.coverUrl && <img alt="" src={book.coverUrl} />}
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

      <form onSubmit={addToMeeting}>
        <button className="primary wide" type="submit" disabled={busy || selected.length === 0}>
          <BookOpen size={18} />
          Add {selected.length} books to next meeting
        </button>
      </form>
    </section>
  );
}
