import * as React from "react"

import { cn } from "@/lib/utils"

function CheckboxInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox-input"
      className={cn(
        "border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 size-4 shrink-0 rounded border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { CheckboxInput }
