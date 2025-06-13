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
      <div className="app-background flex flex-col min-h-screen">
        <AppContent />
      </div>
    </WalletContextProvider>
  )
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

  return (
    <>
      <CompactHeader setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-auto px-4 pb-4">
        {!connected ? (
          <WalletConnectPrompt />
        ) : (
          <TabsContainer
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            createAddresses={createAddresses}
            setCreateAddresses={setCreateAddresses}
            extendLutAddress={extendLutAddress}
            setExtendLutAddress={setExtendLutAddress}
            extendAddresses={extendAddresses}
            setExtendAddresses={setExtendAddresses}
            viewLutAddress={viewLutAddress}
            setViewLutAddress={setViewLutAddress}
          />
        )}
      </main>
    </>
  )
}

function CompactHeader({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  return (
    <motion.header
      className="px-4 py-2 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto flex justify-between items-center">
        <button
          onClick={() => setActiveTab("create")}
          className="flex items-center group transition-all duration-300 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-md"
          aria-label="Go to Create LUT tab"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center mr-2 shadow-lg group-hover:shadow-purple-500/20 transition-all duration-300">
            <Database className="h-3.5 w-3.5 text-white" />
          </div>
          <h1 className="text-xl font-bold font-space-grotesk bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-400">
            Solana LUT Manager
          </h1>
        </button>
        <div className="flex items-center space-x-2">
          <NetworkSelectorWithContext />
          <EnhancedWalletButton />
        </div>
      </div>
    </motion.header>
  )
}

function EnhancedWalletButton() {
  const { publicKey } = useWallet()

  return (
    <div className="custom-wallet-button-wrapper">
      <WalletMultiButton className="custom-wallet-button !h-9 !py-0 !px-3" />
    </div>
  )
}

function NetworkSelectorWithContext() {
  const { network, setNetwork } = useNetwork()

  return <NetworkSelector selectedNetwork={network} onNetworkChange={setNetwork} />
}

function WalletConnectPrompt() {
  return (
    <motion.div
      className="h-full flex items-center justify-center py-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card max-w-md w-full">
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
          <EnhancedWalletButton />
        </CardContent>
      </Card>
    </motion.div>
  )
}

function TabsContainer({
  activeTab,
  setActiveTab,
  createAddresses,
  setCreateAddresses,
  extendLutAddress,
  setExtendLutAddress,
  extendAddresses,
  setExtendAddresses,
  viewLutAddress,
  setViewLutAddress,
}) {
  const tabIcons = {
    create: <Database className="h-4 w-4 mr-2" />,
    extend: <GitBranch className="h-4 w-4 mr-2" />,
    view: <Search className="h-4 w-4 mr-2" />,
  }

  return (
    <motion.div
      className="flex flex-col py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
        <div className="flex justify-center mb-4">
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

        <div className="overflow-visible">
          <TabsContent value="create" className="animate-fade-in">
            <div className="max-w-3xl mx-auto">
              <CreateLUT addresses={createAddresses} setAddresses={setCreateAddresses} />
            </div>
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
            <div className="max-w-3xl mx-auto">
              <ViewLUT lutAddress={viewLutAddress} setLutAddress={setViewLutAddress} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  )
}
