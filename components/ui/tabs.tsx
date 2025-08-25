
"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
export function Tabs({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-4", className)} {...props} />
}
export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex gap-2 rounded-2xl bg-secondary p-2", className)} {...props} />
}
export function TabsTrigger({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("rounded-xl px-4 py-2 text-sm transition", active ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
      {children}
    </button>
  )
}
export function TabsContent({ hidden, children }: { hidden?: boolean; children: React.ReactNode }) {
  if (hidden) return null
  return <div>{children}</div>
}
