import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { verifyAdminPassword } from "../lib/adminPassword";

type AdminUnlockPanelProps = {
  onUnlock: () => void;
};

export function AdminUnlockPanel({ onUnlock }: AdminUnlockPanelProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const result = await verifyAdminPassword(password);

    if (result.ok) {
      setPassword("");
      onUnlock();
    } else {
      setError(result.message);
    }

    setBusy(false);
  }

  return (
    <form className="admin-unlock" onSubmit={unlock}>
      <label>
        Admin password
        <input
          autoComplete="current-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <button className="secondary" type="submit" disabled={busy}>
        <LockKeyhole size={17} />
        {busy ? "Checking" : "Unlock"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
