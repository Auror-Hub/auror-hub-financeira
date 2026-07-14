import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type = "text", ...rest }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "h-[34px] w-full rounded-input border border-border-default bg-surface-primary px-3 text-md text-text-primary placeholder:text-text-placeholder outline-none transition-shadow duration-150",
        "focus:border-action-primary focus:shadow-[0_0_0_3px_rgb(74_108_247_/_0.15)]",
        className,
      )}
      {...rest}
    />
  );
}
