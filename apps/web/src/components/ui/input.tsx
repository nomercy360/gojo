import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  unstyled = false,
  ...props
}: React.ComponentProps<"input"> & { unstyled?: boolean }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={
        unstyled
          ? cn("ym-disable-keys", className)
          : cn(
              "ym-disable-keys h-12 w-full min-w-0 rounded-lg border-[1.5px] border-input bg-card px-3.5 py-2 text-base transition-[color,box-shadow,border-color] outline-none file:mr-3 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 md:text-sm",
              className,
            )
      }
      {...props}
    />
  );
}

export { Input };
