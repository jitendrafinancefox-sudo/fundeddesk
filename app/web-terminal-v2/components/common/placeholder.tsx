"use client";

import { cn } from "@v2/utils/cn";

interface PlaceholderProps {
  label: string;
  className?: string;
}

export function Placeholder({ label, className }: PlaceholderProps) {
  return (
    <div
      data-testid={`placeholder-${label.toLowerCase().replace(/\s+/g, "-")}`}
      aria-label={label}
      className={cn("size-full", className)}
    />
  );
}
