"use client"
import { useState, useEffect } from "react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useWallet } from "@solana/wallet-adapter-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import CreateLUT from "@/components/create-lut"
import ExtendLUT from "@/components/extend-lut"
import ViewLUT from "@/components/view-lut"
import WalletContextProvider, { useNetwork } from "@/components/wallet-provider"
import NetworkSelector from "@/components/network-selector"
import { motion } from "framer-motion"
import { Database, GitBranch, Search } from "lucide-react"

export default function Home() {
  return (
    <WalletContextProvider>
      <div className="app-background">
        <div className="container mx-auto px-4 py-8">
          <motion.header
            className="mb-12 pt-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row justify-between items-center mb-4">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center mr-4 shadow-lg">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-400">
                  Solana LUT Manager
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <NetworkSelectorWithContext />
                <WalletMultiButton />
              </div>
            </div>
            <p className="mt-2 text-slate-300 text-center md:text-left max-w-2xl">
              Easily create, extend, and manage Solana Look-Up Tables with this intuitive interface
            </p>
          </motion.header>

          <main>
            <AppContent />
          </main>

          <footer className="mt-16 text-center text-slate-400 text-sm py-6 border-t border-slate-800">
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
  const [mounted, setMounted] = useState(false)

  // Create LUT state
  const [createAddresses, setCreateAddresses] = useState("")

  // Extend LUT state
  const [extendLutAddress, setExtendLutAddress] = useState("")
  const [extendAddresses, setExtendAddresses] = useState("")

  // View LUT state
  const [viewLutAddress, setViewLutAddress] = useState("")

  // Set mounted to true on client side
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass-card max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Connect Your Wallet</CardTitle>
            <CardDescription className="text-slate-300">
              Please connect your Phantom wallet to use the LUT Manager
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6 pb-8">
            <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-2 animate-pulse-slow">
              <Database className="h-10 w-10 text-purple-400" />
            </div>
            <WalletMultiButton />
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const tabIcons = {
    create: <Database className="h-4 w-4 mr-2" />,
    extend: <GitBranch className="h-4 w-4 mr-2" />,
    view: <Search className="h-4 w-4 mr-2" />,
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="custom-tabs grid grid-cols-3 w-full max-w-md">
            {["create", "extend", "view"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className={`custom-tab ${activeTab === tab ? "custom-tab-active" : ""}`}
              >
                <div className="flex items-center">
                  {tabIcons[tab as keyof typeof tabIcons]}
                  <span className="capitalize">{tab} LUT</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="create" className="animate-fade-in">
          <CreateLUT addresses={createAddresses} setAddresses={setCreateAddresses} />
        </TabsContent>
        <TabsContent value="extend" className="animate-fade-in">
          <ExtendLUT
            lutAddress={extendLutAddress}
            setLutAddress={setExtendLutAddress}
            addresses={extendAddresses}
            setAddresses={setExtendAddresses}
          />
        </TabsContent>
        <TabsContent value="view" className="animate-fade-in">
          <ViewLUT lutAddress={viewLutAddress} setLutAddress={setViewLutAddress} />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
