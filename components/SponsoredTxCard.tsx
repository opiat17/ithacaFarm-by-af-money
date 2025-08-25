
"use client"
import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export function SponsoredTxCard() {
  const [to, setTo] = React.useState("0x")
  const [data, setData] = React.useState("0x")
  const [hash, setHash] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    setHash(null)
    try {
      const res = await fetch("/api/rpc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: "odyssey_sendTransaction", params: [{ to, data }] }),
      }).then(r => r.json())
      if (res?.error) throw new Error(res.error?.message || "RPC error")
      setHash(res?.result)
    } catch (e:any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Sequencer-sponsored Call</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Send a sponsored transaction via <code>odyssey_sendTransaction</code>. Your account must be delegated (EIP-7702).
        </div>
        <div className="grid gap-2">
          <Label>to</Label>
          <Input placeholder="0x..." value={to} onChange={e=>setTo(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>data</Label>
          <Input placeholder="0xdeadbeef..." value={data} onChange={e=>setData(e.target.value)} />
        </div>
        <Button onClick={submit} disabled={loading}>{loading ? "Sending..." : "Send Sponsored Tx"}</Button>
        {hash && <div className="rounded-xl border p-3 text-sm">Tx Hash: <code>{hash}</code></div>}
        {error && <div className="rounded-xl border border-destructive text-destructive p-3 text-sm">{error}</div>}
      </CardContent>
    </Card>
  )
}
