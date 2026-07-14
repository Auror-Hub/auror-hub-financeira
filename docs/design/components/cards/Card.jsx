import React from "react";

/**
 * Card — the brand's surface container. Optional `layer` adds a
 * 2.5px coloured left border tying the card to an ecosystem layer.
 */
export function Card({ children, layer = null, className = "", hoverable = true, style }) {
  const layerClass = layer ? "layer-" + layer : "";
  return (
    <div
      className={["eco-card", layerClass, className].filter(Boolean).join(" ")}
      style={!hoverable ? { transition: "none", ...(style || {}) } : style}
    >
      {children}
    </div>
  );
}
