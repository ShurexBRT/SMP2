import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const variantClass: Record<NonNullable<Props["variant"]>, string> = {
  primary:
    "bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-600",
  secondary:
    "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400",
  ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-200 disabled:text-red-500",
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export function Button({ className, variant = "primary", size = "md", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-300 disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...props}
    />
  );
}
