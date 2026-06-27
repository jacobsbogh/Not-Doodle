import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { LogIn } from "lucide-react";
import { getAuthInstance } from "../lib/firebaseData";
import { Shell } from "./Shell";

const sharedEmail = String(import.meta.env.VITE_FIREBASE_SHARED_EMAIL ?? "").trim();

export function LoginScreen() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!sharedEmail) {
      setError("Shared login email is not configured for this build.");
      return;
    }

    setBusy(true);

    try {
      await signInWithEmailAndPassword(getAuthInstance(), sharedEmail, password);
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
          Club password
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit" disabled={busy || !sharedEmail}>
          <LogIn size={18} />
          {busy ? "Signing in" : "Sign in"}
        </button>
      </form>
    </Shell>
  );
}
