
import fs from "node:fs"
import path from "node:path"
import { createWalletClient, http, parseEther, formatEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { odyssey, sepolia } from "@/lib/chains"
import { rawJsonRpc } from "@/lib/rawrpc"

type Config = {
  mode: "loop" | "cron"
  dailyTxTarget: number
  minDelaySec: number
  maxDelaySec: number
  rangeFrom: number | null
  rangeTo: number | null
  randomSubset: boolean
  subsetSize: number | null
  lowBalanceWei: bigint
  enableEthPing: boolean
  enableDeployRandom: boolean
  enableErc20: boolean
  enableBridge: boolean
  erc20List: `0x${string}`[]
  bridgeAmountEth: number
  bridgeL2Gas: number
}

type AccountItem = {
  privateKey: `0x${string}`
  address: `0x${string}`
  balance?: bigint
  balanceErr?: string
}

const RPC = "https://odyssey.ithaca.xyz" // жёстко
const SEPOLIA_RPC = process.env.SEPOLIA_RPC || "https://rpc.sepolia.org"
const L1_STANDARD_BRIDGE = (process.env.L1_BRIDGE_ADDR || "0x9228665c0D8f9Fc36843572bE50B716B81e042BA") as `0x${string}`

const state = {
  running: false,
  rpc: RPC as string,
  detectedChainId: 0 as number,
  rpcDiag: "" as string,
  clientOnly: false as boolean,
  config: {
    mode: "loop",
    dailyTxTarget: 50,
    minDelaySec: 20,
    maxDelaySec: 120,
    rangeFrom: null,
    rangeTo: null,
    randomSubset: false,
    subsetSize: null,
    lowBalanceWei: 100000000000000n,
    erc20List: [] as `0x${string}`[],
    enableEthPing: true,
    enableDeployRandom: true,
    enableErc20: true,
    enableBridge: false,
    bridgeAmountEth: 0.001,
    bridgeL2Gas: 200000,
  } as Config,
  accounts: [] as AccountItem[],
  logs: [] as any[],
}

// === helpers
function readPrivateKeys() {
  try {
    const text = fs.readFileSync(path.join(process.cwd(), "private.txt"), "utf-8")
    return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => l.startsWith("0x") ? l as `0x${string}` : ("0x"+l) as `0x${string}`)
  } catch { return [] }
}
function pushLog(entry: any) {
  state.logs.unshift(entry)
  if (state.logs.length > 200) state.logs.length = 200
}

// === RPC probe & balances (RAW)
async function probeRpc() {
  try {
    const cidHex = await rawJsonRpc(RPC, "eth_chainId", [])
    const cid = parseInt(cidHex, 16)
    const bnHex = await rawJsonRpc(RPC, "eth_blockNumber", [])
    const bn = parseInt(bnHex, 16)
    state.rpcDiag = `eth_chainId=${cid} • block=${bn}`
    state.detectedChainId = cid
    return cid
  } catch (e:any) {
    state.rpcDiag = "probe error: " + (e?.message || String(e))
    state.detectedChainId = 0
    return 0
  }
}

async function refreshBalances() {
  await Promise.all(state.accounts.map(async (a) => {
    try {
      const hex = await rawJsonRpc(RPC, "eth_getBalance", [a.address, "latest"])
      a.balance = BigInt(hex)
      a.balanceErr = undefined
    } catch (e:any) {
      a.balanceErr = e?.message || String(e)
    }
  }))
}

// === actions (simple demo to avoid breaking)
async function actionEthPing(account: AccountItem) {
  const wallet = createWalletClient({ account: privateKeyToAccount(account.privateKey), chain: odyssey, transport: http(RPC) })
  try {
    const hash = await wallet.sendTransaction({ to: account.address, value: 0n })
    pushLog({ time: Date.now(), account: account.address, action: "Ping 0 ETH", hash })
  } catch (e:any) {
    pushLog({ time: Date.now(), account: account.address, action: "Ping failed", error: e?.message || String(e) })
  }
}

let timer: any = null

export async function startWorker(newConfig: Partial<Config> = {}) {
  state.config = { ...state.config, ...newConfig }
  state.accounts = readPrivateKeys().map(pk => {
    const acc = privateKeyToAccount(pk)
    return { privateKey: pk, address: acc.address }
  })
  const cid = await probeRpc()
  state.clientOnly = (cid === 0) || (process.env.FORCE_CLIENT_ONLY === '1')
  state.running = true
  await refreshBalances()
  if (timer) clearInterval(timer)
  timer = setInterval(refreshBalances, 10000)
}

export function stopWorker() {
  state.running = false
  if (timer) clearInterval(timer)
}

export async function ensureProbe() {
  if (!state.detectedChainId || state.detectedChainId === 0) {
    const cid = await probeRpc()
  state.clientOnly = (cid === 0) || (process.env.FORCE_CLIENT_ONLY === '1')
  }
}



export function getStatus() {
  const cfg = { ...state.config, lowBalanceWei: state.config.lowBalanceWei.toString() }
  return {
    running: state.running,
    rpc: state.rpc,
    chainIdExpected: odyssey.id,
    chainIdDetected: state.detectedChainId,
    rpcDiag: state.rpcDiag,
    config: cfg,
        clientOnly: state.clientOnly,
    accounts: state.accounts.map(a => ({
      address: a.address,
      balanceWei: a.balance !== undefined ? a.balance.toString() : "0",
      balanceEth: a.balance !== undefined ? formatEther(a.balance) : "0",
      balanceErr: a.balanceErr
    })),
    logs: state.logs,
  }
}
