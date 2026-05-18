export type Member = {
  id: string;
  name: string;
  active: boolean;
};

export type PollType = "date" | "book";
export type PollStatus = "open" | "closed";

export type PollOption = {
  id: string;
  label: string;
  startsAt?: string;
  openLibraryKey?: string;
  title?: string;
  authors?: string[];
  firstPublishYear?: number;
  coverId?: number;
};

export type Poll = {
  id: string;
  type: PollType;
  title: string;
  status: PollStatus;
  options: PollOption[];
  votes: Record<string, string[]>;
  chosenOptionId?: string;
};

export type Meeting = {
  id: string;
  title: string;
  status: PollStatus;
  dateOptions: PollOption[];
  bookOptions: PollOption[];
  dateVotes: Record<string, string[]>;
  bookVotes: Record<string, string[]>;
  chosenDateOptionId?: string;
  chosenBookOptionId?: string;
};

export type BookResult = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
};

export type View = "meeting" | "date" | "book" | "members";
