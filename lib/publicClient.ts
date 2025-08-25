
import { createPublicClient, http } from "viem"
import { odyssey } from "./chain"
export const publicClient = createPublicClient({
  chain: odyssey,
  transport: http(process.env.NEXT_PUBLIC_ODYSSEY_RPC || "https://odyssey.ithaca.xyz"),
})
