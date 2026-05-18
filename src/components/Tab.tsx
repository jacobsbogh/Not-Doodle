import type { ReactNode } from "react";

type TabProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
};

export function Tab({ active, onClick, children }: TabProps) {
  return (
    <button
      className={active ? "tab active" : "tab"}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
