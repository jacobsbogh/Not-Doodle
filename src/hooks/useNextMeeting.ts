import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { nextMeetingDoc } from "../lib/firebaseData";
import type { Meeting } from "../types/domain";

export function useNextMeeting() {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    return onSnapshot(
      nextMeetingDoc(),
      (snapshot) => {
        setMeeting(
          snapshot.exists()
            ? ({
                id: snapshot.id,
                ...snapshot.data(),
              } as Meeting)
            : null,
        );
        setError("");
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

  return { meeting, loading, error };
}
