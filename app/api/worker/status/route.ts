
import { NextResponse } from "next/server"
import { getStatus, ensureProbe } from "../_state"

export async function GET() {
  try {
    await ensureProbe()
    const payload = getStatus()
    return NextResponse.json(payload, { status: 200, headers: { "content-type": "application/json" } })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 })
  }
}
