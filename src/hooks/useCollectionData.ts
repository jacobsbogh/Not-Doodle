import { useEffect, useState } from "react";
import { onSnapshot, orderBy, query } from "firebase/firestore";
import { membersCollection, pollsCollection } from "../lib/firebaseData";

export function useCollectionData<T extends { id: string }>(
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
