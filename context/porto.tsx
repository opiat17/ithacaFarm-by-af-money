"use client"
import React from "react"

type PortoType = any

type PortoContextType = {
  porto: PortoType | null
  provider: any | null
  account: `0x${string}` | null
  setAccount: (a: `0x${string}` | null) => void
}

export const PortoContext = React.createContext<PortoContextType>({
  porto: null,
  provider: null,
  account: null,
  setAccount: () => {},
})

export function PortoProvider({ children }: { children: React.ReactNode }) {
  const [porto, setPorto] = React.useState<PortoType | null>(null)
  const [provider, setProvider] = React.useState<any | null>(null)
  const [account, setAccount] = React.useState<`0x${string}` | null>(null)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const mod = await import("porto")
        // @ts-ignore
        const instance = mod.Porto?.create ? mod.Porto.create() : mod.create?.()
        if (!mounted) return
        setPorto(instance)
        // @ts-ignore
        setProvider(instance?.provider || instance)
      } catch (e) {
        console.warn("Porto not available. Ensure `porto` package is installed.", e)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const value = React.useMemo(
    () => ({ porto, provider, account, setAccount }),
    [porto, provider, account]
  )

  return (
    <PortoContext.Provider value={value}>
      {children}
    </PortoContext.Provider>
  )
}
