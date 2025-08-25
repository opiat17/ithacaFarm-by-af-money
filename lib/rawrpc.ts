
export async function rawJsonRpc(rpcUrl: string, method: string, params: any[] = []) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "application/json",
      "accept-encoding": "identity",
      "user-agent": "ithaca-farmer/1.0"
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  })
  const text = await res.text()
  let j: any = null
  try { j = text ? JSON.parse(text) : {} } catch {
    const snippet = (text || "").slice(0, 160).replace(/\s+/g, " ")
    throw new Error(`Bad RPC JSON (status ${res.status}): ${snippet}`)
  }
  if (!res.ok) throw new Error(j?.error?.message || `HTTP ${res.status}`)
  if (j.error) throw new Error(j.error.message || JSON.stringify(j.error))
  return j.result
}
