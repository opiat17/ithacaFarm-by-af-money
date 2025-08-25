
import { NextRequest } from "next/server"
import { createWalletClient, http, parseEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { sepolia } from "@/lib/chains"
import fs from "node:fs"
import path from "node:path"

const SEPOLIA_RPC = process.env.SEPOLIA_RPC || process.env.NEXT_PUBLIC_SEPOLIA_RPC || "https://rpc.sepolia.org"
const L1_STANDARD_BRIDGE = (process.env.L1_BRIDGE_ADDR || "0x9228665c0D8f9Fc36843572bE50B716B81e042BA") as `0x${string}`
const bridgeAbi = [
  { "type":"function","name":"depositETHTo", "stateMutability":"payable",
    "inputs":[{"name":"_to","type":"address"},{"name":"_l2Gas","type":"uint32"},{"name":"_data","type":"bytes"}], "outputs":[] }
] as const

function readKeys() {
  try {
    const p = path.join(process.cwd(), "private.txt")
    const text = fs.readFileSync(p, "utf-8")
    return text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l => l.startsWith("0x") ? l : "0x"+l)
  } catch { return [] }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { index = 0, amountEth = 0.001, l2Gas = 200000 } = body || {}
    const keys = readKeys()
    if (!keys.length) return new Response(JSON.stringify({ ok:false, error:"private.txt empty" }), { status: 400 })
    const key = keys[Math.max(0, Math.min(index, keys.length-1))] as `0x${string}`
    const account = privateKeyToAccount(key)
    const wallet = createWalletClient({ account, chain: sepolia, transport: http(SEPOLIA_RPC) })
    const data = "0x7375706572627269646765" as `0x${string}` // "superbridge"
    const hash = await wallet.writeContract({
      address: L1_STANDARD_BRIDGE, abi: bridgeAbi, functionName: "depositETHTo",
      args: [account.address, l2Gas, data], value: parseEther(String(amountEth))
    })
    return new Response(JSON.stringify({ ok:true, hash }), { status: 200 })
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, error: e?.message || String(e) }), { status: 500 })
  }
}
