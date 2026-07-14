import React from "react";

/** Input — single-line text field with indigo focus ring. */
export function Input({ value, onChange, placeholder, type = "text", className = "", style, ...rest }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={["eco-input", className].filter(Boolean).join(" ")}
      style={style}
      {...rest}
    />
  );
}
