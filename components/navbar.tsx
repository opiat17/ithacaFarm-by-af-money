
"use client"
import { Volume2, VolumeX, Play } from "lucide-react"
import React from "react"
import { useAudio } from "@/components/AudioProvider"

export function Navbar() {
  const { ready, muted, playing, volume, setVolume, toggleMute, ensurePlay } = useAudio()

  return (
    <div className="sticky top-0 z-40 w-full border-b bg-background/50 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="text-sm md:text-base font-semibold tracking-wider">ITHACA FARM BY AFFLICTION MONEY</div>
        <div className="flex items-center gap-3">
          {!playing && ready && (
            <button onClick={ensurePlay} className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs md:text-sm text-muted-foreground hover:text-foreground">
              <Play size={16}/> Play
            </button>
          )}
          <div className="flex items-center gap-2">
            <input
              type="range" min={0} max={100} value={Math.round(volume*100)}
              onChange={(e)=>setVolume(Number(e.target.value)/100)}
              className="w-24 md:w-28 accent-white/80"
              title="Volume"
            />
            <button onClick={toggleMute} className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs md:text-sm text-muted-foreground hover:text-foreground">
              {muted ? (<><VolumeX size={16}/> Unmute</>) : (<><Volume2 size={16}/> Mute</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
