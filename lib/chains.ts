
import { defineChain } from "viem"

export const odyssey = defineChain({
  id: 911867,
  name: "Odyssey Testnet",
  network: "odyssey",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://odyssey.ithaca.xyz"] }, public: { http: ["https://odyssey.ithaca.xyz"] } },
  blockExplorers: { default: { name: "Explorer", url: "https://odyssey-explorer.ithaca.xyz" } },
})

export const sepolia = defineChain({
  id: 11155111,
  name: "Sepolia",
  network: "sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.sepolia.org"] }, public: { http: ["https://rpc.sepolia.org"] } },
  blockExplorers: { default: { name: "Etherscan", url: "https://sepolia.etherscan.io" } },
})
