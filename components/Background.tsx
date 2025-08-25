
"use client"
import React from "react"

export default function Background() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 h-[40rem] w-[40rem] rounded-full bg-white/8 blur-3xl animate-[pulse_22s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[36rem] w-[36rem] rounded-full bg-white/6 blur-3xl animate-[pulse_28s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 h-[28rem] w-[28rem] rounded-full bg-white/5 blur-3xl animate-[pulse_26s_ease-in-out_infinite]" />
      <style jsx>{`
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
      `}</style>
    </div>
  )
}
