
import type { NextRequest } from "next/server"

const RPC = process.env.NEXT_PUBLIC_ODYSSEY_RPC || "https://odyssey.ithaca.xyz"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: body?.id ?? Date.now(),
        method: body?.method,
        params: body?.params ?? [],
      }),
      cache: "no-store" as any,
    })
    const json = await res.json()
    return new Response(JSON.stringify(json), { status: 200, headers: { "content-type": "application/json" } })
  } catch (e:any) {
    return new Response(JSON.stringify({ error: { message: e?.message || String(e) } }), { status: 500 })
  }
}
