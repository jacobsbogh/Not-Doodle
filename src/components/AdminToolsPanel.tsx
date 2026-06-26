import { LockKeyhole, ShieldCheck } from "lucide-react";
import { AdminUnlockPanel } from "./AdminUnlockPanel";

type AdminToolsPanelProps = {
  unlocked: boolean;
  onLock: () => void;
  onUnlock: () => void;
};

export function AdminToolsPanel({
  unlocked,
  onLock,
  onUnlock,
}: AdminToolsPanelProps) {
  return (
    <section className={unlocked ? "admin-console unlocked" : "admin-console"}>
      <div className="admin-console-copy">
        <span className="admin-console-icon">
          <ShieldCheck size={19} />
        </span>
        <div>
          <p className="eyebrow">Admin tools</p>
          <h2>{unlocked ? "Unlocked for this session" : "Locked"}</h2>
          <small>
            Unlock to reset the meeting, delete options, finalize choices, or
            remove members.
          </small>
        </div>
      </div>

      {unlocked ? (
        <button className="ghost compact" type="button" onClick={onLock}>
          <LockKeyhole size={16} />
          Lock admin
        </button>
      ) : (
        <AdminUnlockPanel onUnlock={onUnlock} />
      )}
    </section>
  );
}
