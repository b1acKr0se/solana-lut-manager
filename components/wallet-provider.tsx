"use client"

import type React from "react"
import { useState, useMemo, createContext, useContext } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"
import { clusterApiUrl } from "@solana/web3.js"
import type { Network } from "./network-selector"

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css"

// Create a context for the network
interface NetworkContextType {
  network: Network
  setNetwork: (network: Network) => void
  endpoint: string
}

const NetworkContext = createContext<NetworkContextType>({
  network: "devnet",
  setNetwork: () => {},
  endpoint: "",
})

export const useNetwork = () => useContext(NetworkContext)

export default function WalletContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [network, setNetwork] = useState<Network>(() => {
    if (typeof window === "undefined") return "devnet"
    const saved = localStorage.getItem("solana-network") as Network | null
    if (saved === "mainnet-beta" || saved === "devnet" || saved === "testnet") return saved
    return "devnet"
  })

  const handleSetNetwork = (net: Network) => {
    setNetwork(net)
    localStorage.setItem("solana-network", net)
  }

  const endpoint = useMemo(() => {
    if (network === "mainnet-beta" && process.env.NEXT_PUBLIC_MAINNET_RPC_URL) {
      return process.env.NEXT_PUBLIC_MAINNET_RPC_URL
    }
    if (network === "devnet" && process.env.NEXT_PUBLIC_DEVNET_RPC_URL) {
      return process.env.NEXT_PUBLIC_DEVNET_RPC_URL
    }
    return clusterApiUrl(network)
  }, [network])

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  const networkContextValue = useMemo(
    () => ({
      network,
      setNetwork: handleSetNetwork,
      endpoint,
    }),
    [network, endpoint],
  )

  return (
    <NetworkContext.Provider value={networkContextValue}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </NetworkContext.Provider>
  )
}
