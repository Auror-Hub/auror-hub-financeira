import React from "react";

/**
 * ViewGroup — segmented control for switching views
 * (quadro / lista / calendário). Monospace labels.
 */
export function ViewGroup({ views, active, onChange }) {
  return (
    <div className="eco-view-group">
      {views.map((v) => (
        <button
          key={v}
          onClick={() => onChange && onChange(v)}
          className={"eco-view-btn" + (active === v ? " active" : "")}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
