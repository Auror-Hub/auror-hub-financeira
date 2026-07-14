import React from "react";

/**
 * Button — the brand's primary action control.
 * Five variants map to the ecosystem palette; two sizes.
 */
export function Button({
  children,
  variant = "secondary",
  size = "md",
  icon,
  onClick,
  className = "",
  disabled = false,
  type = "button",
}) {
  const variantClass = {
    primary: "btn-primary",
    success: "btn-success",
    danger: "btn-danger",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
  }[variant] || "btn-secondary";

  const sizeClass = size === "sm" ? "btn-sm" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[variantClass, sizeClass, className].filter(Boolean).join(" ")}
      style={disabled ? { opacity: 0.5, pointerEvents: "none" } : undefined}
    >
      {icon ? <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span> : null}
      {children}
    </button>
  );
}
