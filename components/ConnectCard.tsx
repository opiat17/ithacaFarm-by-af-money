
"use client"
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PortoContext } from "@/context/porto"
import { Copy } from "lucide-react"
import { odyssey } from "@/lib/chain"
import { publicClient } from "@/lib/publicClient"
import { formatEther } from "viem"

export function ConnectCard() {
  const { provider, account, setAccount } = React.useContext(PortoContext)
  const [chainId, setChainId] = React.useState<string | null>(null)
  const [balance, setBalance] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function connect() {
    if (!provider) return alert("Porto provider not ready. Did you run `npm i`?")
    try {
      setLoading(true)
      await provider.request?.({ method: "experimental_connect", params: [{ capabilities: { grantSession: true } }] }).catch(() => null)
      const accounts = await provider.request?.({ method: "eth_requestAccounts" })
      const acc = accounts?.[0]
      setAccount(acc)
      const cId = await provider.request?.({ method: "eth_chainId" }).catch(() => `0x${odyssey.id.toString(16)}`)
      setChainId(cId)
    } catch (e:any) {
      alert(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function refreshBalance() {
    if (!account) return
    try {
      const bal = await publicClient.getBalance({ address: account })
      setBalance(formatEther(bal))
    } catch (e:any) {
      console.error(e)
    }
  }

  React.useEffect(() => { if (account) refreshBalance() }, [account])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet</CardTitle>
        <div className="text-sm text-muted-foreground">Connect with Passkey (Porto, EIP-7702 + RIP-7212)</div>
      </CardHeader>
      <CardContent>
        {!account ? (
          <Button onClick={connect} size="lg">{loading ? "Connecting..." : "Create / Connect with Passkey"}</Button>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">Connected account</div>
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-secondary px-3 py-2">{account}</code>
              <button className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1" onClick={() => navigator.clipboard.writeText(account)}>
                <Copy size={14} /> copy
              </button>
            </div>
            <div className="text-sm text-muted-foreground">Chain: {chainId ?? `0x${odyssey.id.toString(16)}`} (Odyssey)</div>
            <div className="flex items-center gap-2">
              <Button onClick={refreshBalance} variant="secondary">Refresh Balance</Button>
              {balance && <div className="text-sm">{balance} ETH</div>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
