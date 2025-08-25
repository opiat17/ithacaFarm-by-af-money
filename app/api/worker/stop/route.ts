
import { NextResponse } from "next/server"
import { stopWorker } from "../_state"

export async function POST() {
  stopWorker()
  return NextResponse.json({ ok:true })
}
