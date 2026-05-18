import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { LogIn } from "lucide-react";
import { getAuthInstance } from "../lib/firebaseData";
import { Shell } from "./Shell";

export function LoginScreen() {
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
