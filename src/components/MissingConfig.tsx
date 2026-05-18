import { missingFirebaseConfig } from "../firebase";
import { Shell } from "./Shell";

export function MissingConfig() {
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
