import { collection, doc } from "firebase/firestore";
import { auth, db } from "../firebase";

export function getAuthInstance() {
  if (!auth) {
    throw new Error("Firebase Auth is not configured.");
  }

  return auth;
}

export function getDb() {
  if (!db) {
    throw new Error("Firestore is not configured.");
  }

  return db;
}

export function membersCollection() {
  return collection(getDb(), "members");
}

export function pollsCollection() {
  return collection(getDb(), "polls");
}

export function nextMeetingDoc() {
  return doc(getDb(), "meetings", "next");
}
