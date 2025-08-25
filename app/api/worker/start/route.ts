
import { NextRequest, NextResponse } from "next/server"
import { startWorker } from "../_state"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>({}))
  await startWorker(body || {})
  return NextResponse.json({ ok:true })
}
