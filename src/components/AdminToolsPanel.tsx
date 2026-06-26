import { useState } from "react";
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
  const [open, setOpen] = useState(false);

  function unlock() {
    onUnlock();
    setOpen(false);
  }

  function lock() {
    onLock();
    setOpen(false);
  }

  return (
    <div className="admin-menu">
      <button
        className={unlocked ? "admin-trigger unlocked" : "admin-trigger"}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ShieldCheck size={17} />
        Admin
      </button>

      {open && (
        <section className={unlocked ? "admin-popover unlocked" : "admin-popover"}>
          <div className="admin-popover-copy">
            <p className="eyebrow">Admin tools</p>
            <h2>{unlocked ? "Unlocked" : "Locked"}</h2>
            <small>Reset meetings, delete options, finalize choices, and remove members.</small>
          </div>

          {unlocked ? (
            <button className="ghost compact" type="button" onClick={lock}>
              <LockKeyhole size={16} />
              Lock admin
            </button>
          ) : (
            <AdminUnlockPanel onUnlock={unlock} />
          )}
        </section>
      )}
    </div>
  );
}
