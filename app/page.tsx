"use client"
import { useState } from "react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useWallet } from "@solana/wallet-adapter-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import CreateLUT from "@/components/create-lut"
import ExtendLUT from "@/components/extend-lut"
import ViewLUT from "@/components/view-lut"
import WalletContextProvider, { useNetwork } from "@/components/wallet-provider"
import NetworkSelector from "@/components/network-selector"

export default function Home() {
  return (
    <WalletContextProvider>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Solana LUT Manager</h1>
              <div className="flex items-center space-x-4">
                <NetworkSelectorWithContext />
                <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
              </div>
            </div>
            <p className="mt-2 text-slate-300">Manage your Solana Look-Up Tables with ease</p>
          </header>

          <main>
            <AppContent />
          </main>

          <footer className="mt-16 text-center text-slate-400 text-sm">
            <p>© 2025 Solana LUT Manager. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </WalletContextProvider>
  )
}

function NetworkSelectorWithContext() {
  const { network, setNetwork } = useNetwork()

  return <NetworkSelector selectedNetwork={network} onNetworkChange={setNetwork} />
}

function AppContent() {
  const { connected } = useWallet()
  const [activeTab, setActiveTab] = useState("create")

  // Create LUT state
  const [createAddresses, setCreateAddresses] = useState("")

  // Extend LUT state
  const [extendLutAddress, setExtendLutAddress] = useState("")
  const [extendAddresses, setExtendAddresses] = useState("")

  // View LUT state
  const [viewLutAddress, setViewLutAddress] = useState("")

  if (!connected) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Connect Your Wallet</CardTitle>
          <CardDescription className="text-slate-400">
            Please connect your Phantom wallet to use the LUT Manager
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 mb-8">
        <TabsTrigger value="create">Create LUT</TabsTrigger>
        <TabsTrigger value="extend">Extend LUT</TabsTrigger>
        <TabsTrigger value="view">View LUT</TabsTrigger>
      </TabsList>
      <TabsContent value="create">
        <CreateLUT addresses={createAddresses} setAddresses={setCreateAddresses} />
      </TabsContent>
      <TabsContent value="extend">
        <ExtendLUT
          lutAddress={extendLutAddress}
          setLutAddress={setExtendLutAddress}
          addresses={extendAddresses}
          setAddresses={setExtendAddresses}
        />
      </TabsContent>
      <TabsContent value="view">
        <ViewLUT lutAddress={viewLutAddress} setLutAddress={setViewLutAddress} />
      </TabsContent>
    </Tabs>
  )
}
