
"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function BridgeCard() {
  const canonical = "0x9228665c0D8f9Fc36843572bE50B716B81e042BA"
  return (
    <Card>
      <CardHeader><CardTitle>Bridge</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">Bridge Sepolia ETH to Odyssey using SuperBridge or send to Canonical Bridge:</div>
        <div className="rounded-xl border p-3 text-sm">Canonical Bridge: <code>{canonical}</code></div>
        <div className="flex gap-2">
          <Link href="https://superbridge.app" target="_blank"><Button>Open SuperBridge</Button></Link>
          <Link href="https://odyssey-explorer.ithaca.xyz" target="_blank"><Button variant="secondary">Open Explorer</Button></Link>
        </div>
      </CardContent>
    </Card>
  )
}
