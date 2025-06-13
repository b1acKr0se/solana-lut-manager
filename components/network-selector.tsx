"use client"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"

export type Network = "devnet" | "mainnet-beta" | "testnet"

interface NetworkSelectorProps {
  selectedNetwork: Network
  onNetworkChange: (network: Network) => void
}

export default function NetworkSelector({ selectedNetwork, onNetworkChange }: NetworkSelectorProps) {
  const networks: { value: Network; label: string }[] = [
    { value: "devnet", label: "Devnet" },
    { value: "mainnet-beta", label: "Mainnet" },
    { value: "testnet", label: "Testnet" },
  ]

  const currentNetwork = networks.find((n) => n.value === selectedNetwork) || networks[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-slate-800 border-slate-700 text-slate-200">
          <Globe className="mr-2 h-4 w-4" />
          {currentNetwork.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
        {networks.map((network) => (
          <DropdownMenuItem
            key={network.value}
            onClick={() => onNetworkChange(network.value)}
            className={`cursor-pointer ${
              selectedNetwork === network.value ? "bg-slate-700 text-purple-400" : "text-slate-200"
            }`}
          >
            {network.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
