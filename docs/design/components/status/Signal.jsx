import React from "react";

/** Signal — a feed item with a colored left bar and optional mono meta. */
export function Signal({ children, tone = "indigo", meta, onClick }) {
  const barColor = {
    indigo: "var(--indigo)",
    green: "var(--green)",
    terra: "var(--terra)",
    gold: "var(--gold)",
    slate: "var(--slate)",
  }[tone] || "var(--indigo)";

  return (
    <div className="eco-signal" onClick={onClick} style={!onClick ? { cursor: "default" } : undefined}>
      <div className="eco-signal-bar" style={{ background: barColor }} />
      <span className="eco-signal-text">{children}</span>
      {meta ? <span className="eco-signal-meta">{meta}</span> : null}
    </div>
  );
}
