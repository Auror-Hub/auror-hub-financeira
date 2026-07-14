import React from "react";

/**
 * CardHeader — uppercase title row for a Card, with optional
 * icon, count, and a trailing action node.
 */
export function CardHeader({ title, count, icon, action }) {
  return (
    <div className="eco-card-header">
      {icon ? (
        <span style={{ color: "var(--muted)", display: "inline-flex", alignItems: "center", fontSize: 13 }}>
          {icon}
        </span>
      ) : null}
      <span className="eco-card-title">{title}</span>
      {count !== undefined && count !== null ? <span className="eco-card-count">{count}</span> : null}
      {action ? <div style={{ marginLeft: "auto" }}>{action}</div> : null}
    </div>
  );
}
