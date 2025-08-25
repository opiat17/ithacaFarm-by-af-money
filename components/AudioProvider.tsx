
"use client"
import React from "react"

type AudioCtx = {
  ready: boolean
  muted: boolean
  playing: boolean
  volume: number
  setVolume: (v:number)=>void
  toggleMute: () => void
  ensurePlay: () => Promise<void>
  playSfx: () => Promise<void>
}

export const AudioContext = React.createContext<AudioCtx>({
  ready: false, muted: true, playing: false, volume: 0.4, setVolume: () => {},
  toggleMute: () => {}, ensurePlay: async () => {}, playSfx: async () => {}
})

const AMBIENT_CANDIDATES = ["/sound.mp3","/SOUND.MP3","/Sound.mp3","/audio.mp3","/bg.mp3"]
const SFX_CANDIDATES = [
  "/butten1.mp3","/butten2.mp3","/butten3.mp3","/butten4.mp3","/butten5.mp3",
  "/BUTTEN1.MP3","/BUTTEN2.MP3","/BUTTEN3.MP3","/BUTTEN4.MP3","/BUTTEN5.MP3",
  "/button1.mp3","/button2.mp3","/button3.mp3","/button4.mp3","/button5.mp3",
  "/click1.mp3","/click2.mp3","/click3.mp3","/click4.mp3","/click5.mp3",
]

async function head(url: string): Promise<boolean> {
  try { const r = await fetch(url, { method: "HEAD", cache: "no-store" }); return r.ok } catch { return false }
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [ambient, setAmbient] = React.useState<HTMLAudioElement | null>(null)
  const [sfxList, setSfxList] = React.useState<HTMLAudioElement[]>([])
  const [ready, setReady] = React.useState(false)
  const [muted, setMuted] = React.useState(true)
  const [playing, setPlaying] = React.useState(false)
  const [volume, setVolumeState] = React.useState<number>(() => {
    if (typeof window === "undefined") return 0.35
    const v = Number(localStorage.getItem("ambience:volume"))
    return isNaN(v) ? 0.35 : Math.min(1, Math.max(0, v))
  })

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      // ambient
      let ambEl: HTMLAudioElement | null = null
      for (const url of AMBIENT_CANDIDATES) {
        if (!(await head(url))) continue
        ambEl = new Audio()
        ambEl.src = url; ambEl.loop = true; ambEl.muted = true; ambEl.volume = volume
        ambEl.addEventListener("playing", () => setPlaying(true))
        ambEl.addEventListener("pause", () => setPlaying(false))
        break
      }
      if (ambEl) {
        setAmbient(ambEl)
        try { await ambEl.play() } catch {}
      }
      // sfx (try to collect up to five)
      const found: HTMLAudioElement[] = []
      for (const url of SFX_CANDIDATES) {
        if (found.length >= 5) break
        if (!(await head(url))) continue
        const el = new Audio()
        el.src = url; el.muted = true; el.volume = Math.min(1, volume * 0.9)
        found.push(el)
      }
      if (mounted) setSfxList(found)
      setReady(true)
    })()
    return () => { mounted = false }
  }, [])

  React.useEffect(() => {
    if (ambient) ambient.muted = muted
    for (const s of sfxList) s.muted = muted
  }, [muted, ambient, sfxList])

  React.useEffect(() => {
    if (ambient) ambient.volume = volume
    for (const s of sfxList) s.volume = Math.min(1, volume * 0.9)
    if (typeof window !== "undefined") localStorage.setItem("ambience:volume", String(volume))
  }, [volume, ambient, sfxList])

  async function ensurePlay() { if (ambient) { try { await ambient.play() } catch {} } }
  function toggleMute() { setMuted(m => !m); ensurePlay() }
  function setVolume(v:number) { const x = Math.min(1, Math.max(0, v)); setVolumeState(x); if (x === 0) setMuted(true) }

  async function playSfx() {
    if (muted || sfxList.length === 0) return
    const i = Math.floor(Math.random() * sfxList.length)
    const a = sfxList[i]
    try { a.currentTime = 0; await a.play() } catch {}
  }

  const value: AudioCtx = { ready, muted, playing, volume, setVolume, toggleMute, ensurePlay, playSfx }
  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}

export function useAudio() { return React.useContext(AudioContext) }
