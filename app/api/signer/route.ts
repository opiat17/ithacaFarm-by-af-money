
import { NextRequest, NextResponse } from "next/server"
import { privateKeyToAccount } from "viem/accounts"
import { signTransaction } from "viem/accounts"
import { parseEther, encodeFunctionData } from "viem"

type Body = {
  index: number
  // generic tx
  to?: `0x${string}`
  data?: `0x${string}`
  valueEth?: number
  gas?: number
  maxFeePerGasWei: string
  maxPriorityFeePerGasWei: string
  nonce: number
  chainId: number
  // op
  op?: "bridge"
  // bridge params
  bridge?: {
    l2Gas: number
    extraData?: `0x${string}`
    to: `0x${string}`
    amountEth: number
    bridgeContract: `0x${string}`
  }
}

const L1_DEFAULT = "0x9228665c0D8f9Fc36843572bE50B716B81e042BA" as `0x${string}`

function readKeys() {
  try {
    const fs = require("node:fs")
    const path = require("node:path")
    const text = fs.readFileSync(path.join(process.cwd(), "private.txt"), "utf-8")
    return text.split(/\r?\n/).map((l:string)=>l.trim()).filter(Boolean).map((l:string)=> l.startsWith("0x") ? l : ("0x"+l))
  } catch { return [] }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Body
    const keys = readKeys()
    if (!keys.length) return NextResponse.json({ ok:false, error:"private.txt empty" }, { status: 400 })
    const idx = Math.max(0, Math.min(body.index ?? 0, keys.length-1))
    const acc = privateKeyToAccount(keys[idx] as `0x${string}`)

    let to = body.to as any
    let data = (body.data ?? "0x") as `0x${string}`
    let value = body.valueEth ? parseEther(String(body.valueEth)) : 0n

    if (body.op === "bridge" && body.bridge) {
      const bridgeAddr = (body.bridge.bridgeContract || L1_DEFAULT) as `0x${string}`
      const l2Gas = BigInt(body.bridge.l2Gas ?? 200000)
      const extra = (body.bridge.extraData ?? "0x7375706572627269646765") as `0x${string}` // "superbridge"
      data = encodeFunctionData({
        abi: [{
          type:"function", name:"depositETHTo", stateMutability:"payable",
          inputs:[{name:"_to",type:"address"},{name:"_l2Gas",type:"uint32"},{name:"_data",type:"bytes"}], outputs:[]
        }] as const,
        functionName: "depositETHTo",
        args: [body.bridge.to, Number(l2Gas), extra],
      })
      to = bridgeAddr
      value = parseEther(String(body.bridge.amountEth))
    }

    const tx = {
      chainId: BigInt(body.chainId),
      nonce: BigInt(body.nonce),
      gas: BigInt(body.gas ?? 21000),
      to, data, value,
      maxFeePerGas: BigInt(body.maxFeePerGasWei),
      maxPriorityFeePerGas: BigInt(body.maxPriorityFeePerGasWei),
      account: acc,
    } as any

    const signed = await signTransaction({ privateKey: acc.getHdKey().privateKey!, transaction: tx })
    return NextResponse.json({ ok:true, raw: signed })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 })
  }
}
