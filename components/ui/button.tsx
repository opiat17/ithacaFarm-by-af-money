
"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
import { useAudio } from "@/components/AudioProvider"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg" | "icon"
}
const variants = {
  default: "bg-gradient-to-r from-white/8 to-white/20 text-white hover:from-white/12 hover:to-white/28",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-white/10 hover:bg-white/5",
  ghost: "hover:bg-white/5",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
}
const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4", lg: "h-12 px-6 text-lg", icon: "h-10 w-10" }

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", onClick, ...props }, ref) => {
    const { playSfx } = useAudio()
    const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      playSfx()
      onClick?.(e)
    }
    return (
      <button
        ref={ref}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset]",
          variants[variant], sizes[size], className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
