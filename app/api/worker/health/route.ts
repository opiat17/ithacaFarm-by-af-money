
import { NextResponse } from "next/server"
import { ensureProbe, getStatus } from "../_state"

export async function GET() {
  await ensureProbe()
  return NextResponse.json(getStatus(), { status: 200 })
}
