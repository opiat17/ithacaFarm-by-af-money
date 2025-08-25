
"use client"
import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, THead, TR, TH, TBody, TD } from "@/components/ui/table"

export function TraceCard() {
  const [hash, setHash] = React.useState("0x")
  const [tx, setTx] = React.useState<any>(null)
  const [rcpt, setRcpt] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function trace() {
    setLoading(true); setError(null); setTx(null); setRcpt(null)
    try {
      const [txr, rr] = await Promise.all([
        fetch("/api/rpc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method: "eth_getTransactionByHash", params: [hash] }) }).then(r=>r.json()),
        fetch("/api/rpc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method: "eth_getTransactionReceipt", params: [hash] }) }).then(r=>r.json()),
      ])
      if (txr.error) throw new Error(txr.error?.message || "Tx RPC error")
      if (rr.error) throw new Error(rr.error?.message || "Receipt RPC error")
      setTx(txr.result); setRcpt(rr.result)
    } catch (e:any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Transaction Tracer</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <Label>Transaction hash</Label>
          <Input placeholder="0x..." value={hash} onChange={e=>setHash(e.target.value)} />
        </div>
        <Button onClick={trace} disabled={loading}>{loading ? "Tracing..." : "Trace"}</Button>
        {error && <div className="rounded-xl border border-destructive text-destructive p-3 text-sm">{error}</div>}
        {(tx || rcpt) && (
          <div className="rounded-2xl border p-3">
            <Table>
              <THead>
                <TR><TH>Field</TH><TH>Value</TH></TR>
              </THead>
              <TBody>
                {tx && Object.entries(tx).map(([k,v]) => (
                  <TR key={k}><TD className="font-mono text-xs">{k}</TD><TD className="font-mono text-xs break-all">{String(v)}</TD></TR>
                ))}
                {rcpt && Object.entries(rcpt).map(([k,v]) => (
                  <TR key={k}><TD className="font-mono text-xs">{k}</TD><TD className="font-mono text-xs break-all">{Array.isArray(v) ? JSON.stringify(v) : String(v)}</TD></TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
