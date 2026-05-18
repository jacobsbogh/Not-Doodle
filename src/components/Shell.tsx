import type { ReactNode } from "react";

type ShellProps = {
  action?: ReactNode;
  children: ReactNode;
};

export function Shell({ action, children }: ShellProps) {
  return (
    <main className="app-shell">
      <header className="hero">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            ND
          </span>
          <div>
            <p className="eyebrow">Not Doodle</p>
          </div>
        </div>
        {action}
      </header>
      {children}
    </main>
  );
}
