
import * as React from "react"
import { cn } from "@/lib/utils"
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input ref={ref}
      className={cn("flex h-10 w-full rounded-xl border border-input bg-black/20 px-4 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring", className)}
      {...props}
    />
  )
})
Input.displayName = "Input"
export { Input }
