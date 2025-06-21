export function getSolscanUrl(signature: string, network: "devnet" | "mainnet-beta" | "testnet" = "devnet"): string {
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`
  return `https://solscan.io/tx/${signature}${cluster}`
}

export function truncateSignature(signature: string, length = 8): string {
  if (signature.length <= length * 2) return signature
  return `${signature.slice(0, length)}...${signature.slice(-length)}`
}
