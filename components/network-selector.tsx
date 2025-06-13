"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe, Check } from "lucide-react"

export type Network = "devnet" | "mainnet-beta" | "testnet"

interface NetworkSelectorProps {
  selectedNetwork: Network
  onNetworkChange: (network: Network) => void
}

export default function NetworkSelector({ selectedNetwork, onNetworkChange }: NetworkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const networks: { value: Network; label: string; color: string }[] = [
    { value: "devnet", label: "Devnet", color: "bg-purple-500" },
    { value: "mainnet-beta", label: "Mainnet", color: "bg-green-500" },
  ]

  const currentNetwork = networks.find((n) => n.value === selectedNetwork) || networks[0]

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-slate-800/70 border-slate-700/50 text-slate-200 hover:bg-slate-700/50 transition-all duration-300"
        >
          <div className={`w-2 h-2 rounded-full mr-2 ${currentNetwork.color} animate-pulse`} />
          <Globe className="mr-2 h-4 w-4" />
          {currentNetwork.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-slate-800/90 backdrop-blur-sm border-slate-700/50 shadow-xl shadow-purple-900/20"
      >
        {networks.map((network) => (
          <DropdownMenuItem
            key={network.value}
            onClick={() => {
              onNetworkChange(network.value)
              setIsOpen(false)
            }}
            className={`cursor-pointer group hover:bg-slate-700/50 transition-all duration-200 ${
              selectedNetwork === network.value ? "bg-slate-700/30" : ""
            }`}
          >
            <div className="flex items-center w-full">
              <div className={`w-2 h-2 rounded-full mr-2 ${network.color}`} />
              <span className={`${selectedNetwork === network.value ? "text-purple-400" : "text-slate-200"}`}>
                {network.label}
              </span>
              {selectedNetwork === network.value && <Check className="ml-auto h-4 w-4 text-purple-400" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
