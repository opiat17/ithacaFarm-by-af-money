'use client'

import React from 'react'
import type { Hex, Chain } from 'viem'
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  encodeFunctionData,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

/* ---------------------- Chains & RPC ---------------------- */

const ODX_RPC = 'https://odyssey.ithaca.xyz'
const ODX_EXPLORER = 'https://odyssey-explorer.ithaca.xyz'

const odyssey: Chain = {
  id: 911867,
  name: 'Odyssey',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [ODX_RPC] }, public: { http: [ODX_RPC] } },
  blockExplorers: { default: { name: 'Odyssey Explorer', url: ODX_EXPLORER } },
} as const

// Sepolia — дефолт + фолбэки
const SEP_RPC_DEFAULT = 'https://ethereum-sepolia.publicnode.com'
const SEP_RPCS = [
  'https://ethereum-sepolia.publicnode.com',
  'https://rpc.sepolia.org',
  'https://sepolia.gateway.tenderly.co',
  'https://1rpc.io/sepolia',
  'https://0xrpc.io',
] as const

/* L1 Standard Bridge (Sepolia) */
const L1_BRIDGE = '0x9228665c0D8f9Fc36843572bE50B716B81e042BA' as const
const L1_BRIDGE_ABI = [
  {
    type: 'function',
    name: 'depositETHTo',
    stateMutability: 'payable',
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_l2Gas', type: 'uint32' },
      { name: '_data', type: 'bytes' },
    ],
    outputs: [],
  },
] as const

/* ---------------------- Types ---------------------- */

type Key = { pk: `0x${string}`, addr: `0x${string}` }
type Log = { time: number, account: string, action: string, status?: string, hash?: `0x${string}`, error?: string }

/* ---------------------- Small UI ---------------------- */

function Btn(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean
    variant?: 'solid' | 'ghost'
  },
) {
  const { loading, variant = 'solid', className = '', children, ...rest } = props
  const base =
    variant === 'solid'
      ? 'relative inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-black bg-gradient-to-r from-white to-white/90 hover:from-white/95 hover:to-white/80 transition-all duration-300 shadow-[0_6px_16px_rgba(255,255,255,0.1)] ring-1 ring-black/10'
      : 'relative inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-white/90 bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300'
  return (
    <button
      {...rest}
      disabled={props.disabled || loading}
      className={`${base} ${
        props.disabled || loading ? 'opacity-60 cursor-not-allowed' : ''
      } ${className}`}
    >
      {loading && (
        <span
          className={
            'mr-2 h-4 w-4 border-2 rounded-full animate-spin ' +
            (variant === 'solid'
              ? 'border-black/50 border-t-transparent'
              : 'border-white/60 border-t-transparent')
          }
        />
      )}
      {children}
    </button>
  )
}

/* ---------------------- Page ---------------------- */

export default function Home() {
  /* state */
  const [keys, setKeys] = React.useState<Key[]>([])
  const [logs, setLogs] = React.useState<Log[]>([])
  const [balances, setBalances] = React.useState<Record<string, string>>({})
  const [isRunning, setIsRunning] = React.useState(false)
  const [loadingBalances, setLoadingBalances] = React.useState(false)

  // SETTINGS (в модалке)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [sepRpc, setSepRpc] = React.useState<string>(SEP_RPC_DEFAULT)

  // Guards
  const [minBalanceEnabled, setMinBalanceEnabled] = React.useState(true)
  const [minBalanceEth, setMinBalanceEth] = React.useState('0.0003')

  // Mode: infinity | cron
  const [mode, setMode] = React.useState<'infinity' | 'cron'>('cron')
  // Infinity delays
  const [minDelaySec, setMinDelaySec] = React.useState('20')
  const [maxDelaySec, setMaxDelaySec] = React.useState('120')
  // Cron (daily targets)
  const [dailyMin, setDailyMin] = React.useState('40')
  const [dailyMax, setDailyMax] = React.useState('60')

  // Actions toggles
  const [enablePing, setEnablePing] = React.useState(true)
  const [enableApprove, setEnableApprove] = React.useState(true)
  const [enableMint, setEnableMint] = React.useState(true)
  const [enableDeploy, setEnableDeploy] = React.useState(false)
  const [enableBridge, setEnableBridge] = React.useState(false)

  // ERC20 list for approve (editable)
  const [erc20List, setErc20List] = React.useState(
    [
      '0x706Aa5C8e5cC2c67Da21ee220718f6f6B154E75c',
      '0x390dD40042a844F92b499069CFe983236d9fe204',
      '0x238c8CD93ee9F8c7Edf395548eF60c0d2e46665E',
      '0x92Bd72eEC6a84b46051faB0F2400765665659cb4',
      '0xaa52Be611a9b620aFF67FbC79326e267cc3F2c69',
      '0x7E06a337929B1Cb92363e15414e37959a36E5338',
    ].join(', '),
  )

  // Bridge settings
  const [bridgePercent, setBridgePercent] = React.useState('10') // % Sepolia баланса
  const [bridgeL2Gas, setBridgeL2Gas] = React.useState('200000') // uint32
  const [bridgeReserve, setBridgeReserve] = React.useState('0.0002') // ETH на газ Sepolia
  const [bridgeData, setBridgeData] = React.useState<Hex>(
    '0x7375706572627269646765', // "superbridge"
  )

  /* clients */
  const pubOdx = React.useMemo(
    () =>
      createPublicClient({
        chain: odyssey,
        transport: http(ODX_RPC, { timeout: 12000, retryCount: 2, retryDelay: 1000 }),
      }),
    [],
  )
  function makeSepoliaClient(rpc: string) {
    return createPublicClient({
      chain: sepolia,
      transport: http(rpc, { timeout: 12000, retryCount: 2, retryDelay: 1000 }),
    })
  }
  const [pubSep, setPubSep] = React.useState(() => makeSepoliaClient(sepRpc))
  React.useEffect(() => {
    setPubSep(makeSepoliaClient(sepRpc))
  }, [sepRpc])

  /* helpers */
  const runningRef = React.useRef(false)
  const perWalletTarget = React.useRef<Record<string, number>>({})

  function addLog(l: Partial<Log>) {
    setLogs(prev => [{ time: Date.now(), account: '-', action: '', ...l } as Log, ...prev].slice(0, 800))
  }
  function parseHexPk(line: string): `0x${string}` | null {
    const m = line.trim().match(/^0x[0-9a-fA-F]{64}$/)
    return m ? (m[0] as `0x${string}`) : null
  }
  function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms))
  }
  function rand(a: number, b: number) {
    const x = Math.min(a, b),
      y = Math.max(a, b)
    return x + Math.random() * (y - x)
  }
  function parsePct(s: string) {
    const p = Math.max(0, Math.min(100, parseFloat(s || '0') || 0))
    return p
  }

  function capGasPrice(network: bigint, capGwei = 1.0) {
    if (!capGwei || capGwei <= 0) return network
    const capWei = BigInt(Math.floor(capGwei * 1e9))
    return network > capWei ? capWei : network
  }

  async function importPrivateTxt(file: File) {
    const text = await file.text()
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    const ok: Key[] = []
    for (let i = 0; i < lines.length; i++) {
      const pk = parseHexPk(lines[i])
      if (!pk) {
        addLog({ action: 'import', error: `bad pk on line ${i + 1}` })
        continue
      }
      try {
        const acc = privateKeyToAccount(pk)
        ok.push({ pk, addr: acc.address as `0x${string}` })
      } catch (e: any) {
        addLog({ action: 'import', error: e?.message || String(e) })
      }
    }
    const uniq = Array.from(new Map(ok.map(k => [k.addr, k])).values())
    setKeys(uniq)
    await refreshBalances(uniq)
  }

  async function refreshBalances(arr?: Key[]) {
    const items = arr ?? keys
    if (!items.length) return
    setLoadingBalances(true)
    const out: Record<string, string> = {}
    try {
      await Promise.all(
        items.map(async k => {
          try {
            const b = await pubOdx.getBalance({ address: k.addr })
            out[k.addr] = (Number(b) / 1e18).toFixed(6)
          } catch {
            out[k.addr] = '0.000000'
          }
        }),
      )
      setBalances(out)
    } finally {
      setLoadingBalances(false)
    }
  }

  function nextDelayCronMs(addr?: `0x${string}`) {
    const minT = Math.max(1, parseInt(dailyMin || '40') || 40)
    const maxT = Math.max(minT, parseInt(dailyMax || '60') || 60)
    let tgt = perWalletTarget.current[addr || '']
    if (!tgt) {
      tgt = Math.floor(rand(minT, maxT))
      perWalletTarget.current[addr || ''] = tgt
    }
    const base = 86400 / tgt
    const sec = rand(base * 0.5, base * 1.5)
    return sec * 1000
  }

  function nextDelayInfinityMs() {
    const a = Math.max(1, parseFloat(minDelaySec || '1') || 1)
    const b = Math.max(a, parseFloat(maxDelaySec || '5') || 5)
    return rand(a, b) * 1000
  }

  async function wallet(pk: `0x${string}`, chain: 'odyssey' | 'sepolia' = 'odyssey') {
    const account = privateKeyToAccount(pk)
    const rpc = chain === 'odyssey' ? ODX_RPC : sepRpc
    const chainObj = chain === 'odyssey' ? odyssey : sepolia
    return createWalletClient({
      account,
      chain: chainObj,
      transport: http(rpc, { timeout: 12000, retryCount: 2, retryDelay: 1000 }),
    })
  }

  async function canAfford(addr: `0x${string}`, gas: bigint, gasPrice: bigint, value: bigint = 0n) {
    try {
      const b = await pubOdx.getBalance({ address: addr })
      return b >= gas * gasPrice + value
    } catch {
      return false
    }
  }

  /* ---------------------- Actions (Odyssey) ---------------------- */

  // Ping 0
  async function actionPing(i: number) {
    const k = keys[i]
    if (!k) return
    try {
      let gp = await pubOdx.getGasPrice()
      gp = capGasPrice(gp)
      const gas: bigint = 30_000n
      if (minBalanceEnabled && !(await canAfford(k.addr, gas, gp))) {
        addLog({ account: k.addr, action: 'Ping 0', error: 'insufficient funds' })
        return
      }
      const w = await wallet(k.pk, 'odyssey')
      const hash = await w.sendTransaction({ to: k.addr, value: 0n, gas, gasPrice: gp })
      addLog({ account: k.addr, action: 'Ping 0', status: 'sent', hash })
      await pubOdx.waitForTransactionReceipt({ hash })
      addLog({ account: k.addr, action: 'Ping 0', status: 'confirmed', hash })
    } catch (e: any) {
      addLog({ account: k.addr, action: 'Ping 0', error: e?.message || String(e) })
    }
  }

  // Approve(random ERC20) spender=self, amount=0
  function encApprove(spender: `0x${string}`, valueHex: string) {
    const selector = '0x095ea7b3'
    const a = spender.toLowerCase().replace('0x', '').padStart(64, '0')
    const v = valueHex.replace('0x', '').padStart(64, '0')
    return (selector + a + v) as Hex
  }
  async function actionApprove(i: number) {
    const k = keys[i]
    if (!k) return
    const list = erc20List
      .split(/[, \n\r;]+/)
      .map(s => s.trim())
      .filter(Boolean) as `0x${string}`[]
    if (!list.length) {
      addLog({ account: k.addr, action: 'ERC20.approve', error: 'list empty' })
      return
    }
    const token = list[Math.floor(Math.random() * list.length)]
    const data = encApprove(k.addr, '0x0')
    try {
      let gp = await pubOdx.getGasPrice()
      gp = capGasPrice(gp)
      const gas: bigint = 80_000n
      if (minBalanceEnabled && !(await canAfford(k.addr, gas, gp))) {
        addLog({ account: k.addr, action: `Approve(${token})`, error: 'insufficient funds' })
        return
      }
      const w = await wallet(k.pk, 'odyssey')
      const hash = await w.sendTransaction({ to: token, data, value: 0n, gas, gasPrice: gp })
      addLog({ account: k.addr, action: `Approve(${token})`, status: 'sent', hash })
      await pubOdx.waitForTransactionReceipt({ hash })
      addLog({ account: k.addr, action: `Approve(${token})`, status: 'confirmed', hash })
    } catch (e: any) {
      addLog({ account: k.addr, action: `Approve(${token})`, error: e?.message || String(e) })
    }
  }

  // Mint on 3 contracts: mint(address,uint256)
  const MINT_CONTRACTS: `0x${string}`[] = [
    '0x706Aa5C8e5cC2c67Da21ee220718f6f6B154E75c', // EXP
    '0x390dD40042a844F92b499069CFe983236d9fe204', // EXP2
    '0x238c8CD93ee9F8c7Edf395548eF60c0d2e46665E', // ExperimentERC20
  ]
  function encMint(recipient: `0x${string}`, rawAmountWei: bigint) {
    const selector = '0x40c10f19'
    const to = recipient.toLowerCase().replace('0x', '').padStart(64, '0')
    const val = rawAmountWei.toString(16).padStart(64, '0')
    return (selector + to + val) as Hex
  }
  async function actionMint(i: number) {
    const k = keys[i]
    if (!k) return
    const target = MINT_CONTRACTS[Math.floor(Math.random() * MINT_CONTRACTS.length)]
    const amount = (BigInt(1 + Math.floor(Math.random() * 3))) * 10n ** 18n // 1..3 tokens
    const data = encMint(k.addr, amount)
    try {
      let gp = await pubOdx.getGasPrice()
      gp = capGasPrice(gp)
      const gas: bigint = 120_000n
      if (minBalanceEnabled && !(await canAfford(k.addr, gas, gp))) {
        addLog({ account: k.addr, action: `Mint(${target})`, error: 'insufficient funds' })
        return
      }
      const w = await wallet(k.pk, 'odyssey')
      const hash = await w.sendTransaction({ to: target, data, value: 0n, gas, gasPrice: gp })
      addLog({ account: k.addr, action: `Mint(${target})`, status: 'sent', hash })
      await pubOdx.waitForTransactionReceipt({ hash })
      addLog({ account: k.addr, action: `Mint(${target})`, status: 'confirmed', hash })
    } catch (e: any) {
      addLog({ account: k.addr, action: `Mint(${target})`, error: e?.message || String(e) })
    }
  }

  // Deploy tiny contract (по умолчанию выкл)
  async function actionDeploy(i: number) {
    const k = keys[i]
    if (!k) return
    const data = '0x6001600c60003960016000f300' as Hex
    try {
      let gp = await pubOdx.getGasPrice()
      gp = capGasPrice(gp)
      const gas: bigint = 60_000n
      if (minBalanceEnabled && !(await canAfford(k.addr, gas, gp))) {
        addLog({ account: k.addr, action: 'Deploy', error: 'insufficient funds' })
        return
      }
      const w = await wallet(k.pk, 'odyssey')
      const hash = await w.sendTransaction({ data, value: 0n, gas, gasPrice: gp })
      addLog({ account: k.addr, action: 'Deploy', status: 'sent', hash })
      await pubOdx.waitForTransactionReceipt({ hash })
      addLog({ account: k.addr, action: 'Deploy', status: 'confirmed', hash })
    } catch (e: any) {
      addLog({ account: k.addr, action: 'Deploy', error: e?.message || String(e) })
    }
  }

  /* ---------------------- Bridge (Sepolia -> Odyssey) ---------------------- */

  async function actionBridge(i: number) {
    const k = keys[i]
    if (!k) return
    try {
      const bal = await pubSep.getBalance({ address: k.addr }) // Sepolia balance
      let gp = await pubSep.getGasPrice()
      // для стабильности по Sepolia ничего не режем, но можно cap при желании

      const gas: bigint = 1_304_456n // из твоего рабочего примера
      const reserve = parseEther(bridgeReserve || '0') // оставим на газ
      const available = bal > gas * gp + reserve ? bal - gas * gp - reserve : 0n

      const pct = parsePct(bridgePercent)
      const bps = Math.floor(pct * 100) // 2 знака
      const amount = available > 0n ? (available * BigInt(bps)) / 10_000n : 0n

      if (amount <= 0n) {
        addLog({ account: k.addr, action: 'Bridge', error: 'amount<=0 (low balance / high gas)' })
        return
      }

      const l2Gas = Math.max(0, Math.min(2 ** 32 - 1, parseInt(bridgeL2Gas || '200000') || 200000))
      const data = encodeFunctionData({
        abi: L1_BRIDGE_ABI,
        functionName: 'depositETHTo',
        args: [k.addr, l2Gas, bridgeData],
      })

      const w2 = await wallet(k.pk, 'sepolia')
      const hash = await w2.sendTransaction({
        to: L1_BRIDGE,
        data,
        value: amount,
        gas,
        gasPrice: gp,
      })
      addLog({ account: k.addr, action: `Bridge ${pct.toFixed(2)}%`, status: 'sent', hash })
      await pubSep.waitForTransactionReceipt({ hash })
      addLog({ account: k.addr, action: `Bridge ${pct.toFixed(2)}%`, status: 'confirmed', hash })
    } catch (e: any) {
      addLog({ account: k.addr, action: 'Bridge', error: e?.message || String(e) })
    }
  }

  /* ---------------------- Scheduler ---------------------- */

  function pickAction() {
    const pool: ((i: number) => Promise<void>)[] = []
    if (enablePing) pool.push(actionPing)
    if (enableApprove) pool.push(actionApprove)
    if (enableMint) pool.push(actionMint)
    if (enableDeploy) pool.push(actionDeploy)
    if (enableBridge) pool.push(actionBridge)
    if (!pool.length) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  async function runLoop() {
    if (isRunning || keys.length === 0) {
      addLog({ action: 'start', error: keys.length === 0 ? 'no keys' : 'already running' })
      return
    }
    runningRef.current = true
    setIsRunning(true)
    addLog({ action: 'start', status: `mode=${mode}` })

    let cursor = 0
    try {
      while (runningRef.current) {
        const i = cursor
        cursor = (cursor + 1) % keys.length
        const fn = pickAction()
        if (!fn) {
          await sleep(300)
          continue
        }
        await fn(i)
        const addr = keys[i]?.addr
        const delay =
          mode === 'cron' ? nextDelayCronMs(addr) : nextDelayInfinityMs()
        await sleep(delay)
      }
    } finally {
      runningRef.current = false
      setIsRunning(false)
      addLog({ action: 'stop', status: 'stopped' })
    }
  }
  function stopLoop() {
    runningRef.current = false
    setIsRunning(false)
  }

  /* ---------------------- UI ---------------------- */

  const th = Math.max(0, parseFloat(minBalanceEth || '0') || 0)

  return (
    <div className="min-h-screen text-white bg-[radial-gradient(1200px_600px_at_80%_-20%,rgba(255,255,255,0.06),transparent),linear-gradient(180deg,#0b0b0b,#0a0a0a)]">
      <div className="max-w-6xl mx-auto py-10 px-4">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            ITHACA FARM BY AFFLICTION MONEY
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/60">{isRunning ? 'running…' : 'idle'}</span>
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/15 border border-white/10"
            >
              Settings
            </button>
          </div>
        </header>

        {/* Controls */}
        <section className="mb-10 grid gap-6 lg:grid-cols-2">
          {/* Left card */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".txt"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) importPrivateTxt(f)
                }}
                className="text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-white/90 file:text-black hover:file:bg-white"
              />
              <Btn variant="ghost" onClick={() => refreshBalances()} loading={loadingBalances}>
                Refresh balances
              </Btn>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={enablePing} onChange={e => setEnablePing(e.target.checked)} className="accent-white/80" />
                <span>Ping</span>
              </label>
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={enableApprove} onChange={e => setEnableApprove(e.target.checked)} className="accent-white/80" />
                <span>ERC20.approve (random)</span>
              </label>
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={enableMint} onChange={e => setEnableMint(e.target.checked)} className="accent-white/80" />
                <span>Mint EXP / EXP2 / ExperimentERC20</span>
              </label>
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={enableDeploy} onChange={e => setEnableDeploy(e.target.checked)} className="accent-white/80" />
                <span>Deploy random</span>
              </label>
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={enableBridge} onChange={e => setEnableBridge(e.target.checked)} className="accent-white/80" />
                <span>Bridge Sepolia → Odyssey</span>
              </label>
            </div>

            <div className="mt-4">
              <div className="text-xs text-white/60 mb-1">ERC20 list (comma/space/line-separated)</div>
              <textarea
                value={erc20List}
                onChange={e => setErc20List(e.target.value)}
                className="w-full h-24 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Btn onClick={runLoop} loading={isRunning} disabled={isRunning || keys.length === 0}>
                Start
              </Btn>
              <Btn variant="ghost" onClick={stopLoop}>
                Stop
              </Btn>
            </div>
            <div className="mt-2 text-xs text-white/50">
              Pure client (viem); RPC auto-fallback; <b>mode</b>=Infinity/Cron; bridge% по Sepolia балансу.
            </div>
          </div>

          {/* Wallets */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm">Wallets ({keys.length})</div>
              <div className="text-xs text-white/60">
                Sepolia RPC:{' '}
                <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">{new URL(sepRpc).host}</span>
              </div>
            </div>
            <div className="max-h-64 overflow-auto rounded">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/70 border-b border-white/10 sticky top-0 bg-black/20 backdrop-blur z-10">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Address</th>
                    <th className="py-2 pr-2">Balance (ETH)</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k, i) => {
                    const bal = parseFloat(balances[k.addr] ?? '0')
                    const low = minBalanceEnabled && bal < Math.max(0, parseFloat(minBalanceEth || '0') || 0)
                    return (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/10 transition-colors">
                        <td className="py-2 pr-2 text-white/70">{i}</td>
                        <td className="py-2 pr-2 font-mono">{k.addr}</td>
                        <td className={'py-2 pr-2 font-mono ' + (low ? 'text-red-400' : 'text-white')}>
                          {balances[k.addr] ?? '0.000000'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Logs */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm">Logs</div>
            <Btn variant="ghost" onClick={() => setLogs([])}>Clear</Btn>
          </div>
          <div className="max-h-[50vh] overflow-auto rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/70 border-b border-white/10 sticky top-0 bg-black/20 backdrop-blur z-10">
                  <th className="py-2 pr-2">Time</th>
                  <th className="py-2 pr-2">Account</th>
                  <th className="py-2 pr-2">Action</th>
                  <th className="py-2 pr-2">Status / Tx</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/10 transition-colors">
                    <td className="py-2 pr-2">{new Date(l.time).toLocaleTimeString()}</td>
                    <td className="py-2 pr-2 font-mono">{l.account}</td>
                    <td className="py-2 pr-2">{l.action}</td>
                    <td className="py-2 pr-2">
                      {l.error ? (
                        <span className="text-red-400">{l.error}</span>
                      ) : l.hash ? (
                        <a className="underline" target="_blank" rel="noreferrer" href={`${ODX_EXPLORER}/tx/${l.hash}`}>
                          {l.status || 'sent'} — {l.hash.slice(0, 10)}…
                        </a>
                      ) : (
                        l.status || '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Settings modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="w-[760px] max-w-[92vw] rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm">Settings</div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-sm px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15"
              >
                Close
              </button>
            </div>

            <div className="space-y-5">
              {/* Mode */}
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/60 w-40">Mode</span>
                <label className="text-xs flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'infinity'}
                    onChange={() => setMode('infinity')}
                    className="accent-white/80"
                  />
                  Infinity
                </label>
                <label className="text-xs flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'cron'}
                    onChange={() => setMode('cron')}
                    className="accent-white/80"
                  />
                  Cron (daily spread)
                </label>
              </div>

              {/* Infinity delays */}
              {mode === 'infinity' && (
                <div className="flex items-center gap-3">
                  <label className="text-xs text-white/60 w-40">Delay per tx (sec)</label>
                  <input
                    value={minDelaySec}
                    onChange={e => setMinDelaySec(e.target.value)}
                    className="w-24 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <span className="text-white/50">—</span>
                  <input
                    value={maxDelaySec}
                    onChange={e => setMaxDelaySec(e.target.value)}
                    className="w-24 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              )}

              {/* Cron targets */}
              {mode === 'cron' && (
                <div className="flex items-center gap-3">
                  <label className="text-xs text-white/60 w-40">Daily target (min/max)</label>
                  <input
                    value={dailyMin}
                    onChange={e => setDailyMin(e.target.value)}
                    className="w-24 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <span className="text-white/50">—</span>
                  <input
                    value={dailyMax}
                    onChange={e => setDailyMax(e.target.value)}
                    className="w-24 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              )}

              {/* Sepolia RPC */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-white/60 w-40">Sepolia RPC</label>
                <input
                  value={sepRpc}
                  onChange={e => setSepRpc(e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {/* Guard */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-white/60 w-40">Min balance guard</label>
                <input
                  type="checkbox"
                  checked={minBalanceEnabled}
                  onChange={e => setMinBalanceEnabled(e.target.checked)}
                  className="accent-white/80"
                />
                <input
                  value={minBalanceEth}
                  onChange={e => setMinBalanceEth(e.target.value)}
                  className="w-32 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <span className="text-xs text-white/50">ETH (Odyssey)</span>
              </div>

              {/* Bridge settings */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-white/60 w-40">Bridge % of Sepolia</label>
                  <input
                    value={bridgePercent}
                    onChange={e => setBridgePercent(e.target.value)}
                    className="w-24 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <span className="text-xs text-white/50">%</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-white/60 w-40">Sepolia reserve</label>
                  <input
                    value={bridgeReserve}
                    onChange={e => setBridgeReserve(e.target.value)}
                    className="w-32 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <span className="text-xs text-white/50">ETH</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-white/60 w-40">L2 Gas</label>
                  <input
                    value={bridgeL2Gas}
                    onChange={e => setBridgeL2Gas(e.target.value)}
                    className="w-32 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-white/60 w-40">Data (hex)</label>
                  <input
                    value={bridgeData}
                    onChange={e => setBridgeData(e.target.value as Hex)}
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
