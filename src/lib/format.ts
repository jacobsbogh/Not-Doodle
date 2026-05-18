export function makeId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export function coverUrl(coverId?: number) {
  return coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
    : undefined;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatTimeOnly(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
