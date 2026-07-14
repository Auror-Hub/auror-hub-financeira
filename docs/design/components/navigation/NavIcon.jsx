import React from "react";

/**
 * NavIcon — a 34px icon button for the left rail. Active state uses
 * the indigo tint; an optional activity orb sits in the top-right.
 */
export function NavIcon({ icon, active = false, orb, title, onClick }) {
  const orbColor = { indigo: "var(--indigo)", green: "var(--green)", gold: "var(--gold)" }[orb];
  return (
    <div
      title={title}
      onClick={onClick}
      className={"eco-nav-item" + (active ? " active" : "")}
    >
      {icon}
      {orb ? <span className="eco-nav-orb" style={{ background: orbColor }} /> : null}
    </div>
  );
}
