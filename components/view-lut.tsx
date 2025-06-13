"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Connection, PublicKey } from "@solana/web3.js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Copy, Search } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useNetwork } from "./wallet-provider"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

interface LUTAddress {
  index: number
  address: string
}

interface ViewLUTProps {
  lutAddress: string
  setLutAddress: (address: string) => void
}

export default function ViewLUT({ lutAddress, setLutAddress }: ViewLUTProps) {
  const { publicKey } = useWallet()
  const { endpoint } = useNetwork()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addresses, setAddresses] = useState<LUTAddress[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const handleViewLUT = async () => {
    setIsLoading(true)
    setError(null)
    setAddresses([])

    try {
      // Validate LUT address
      if (!lutAddress) {
        throw new Error("LUT address is required")
      }

      let lookupTablePubkey: PublicKey
      try {
        lookupTablePubkey = new PublicKey(lutAddress)
      } catch (e) {
        throw new Error("Invalid LUT address")
      }

      // Connect to Solana
      const connection = new Connection(endpoint, "confirmed")

      // Fetch LUT account info
      const lookupTableAccount = await connection.getAddressLookupTable(lookupTablePubkey)

      if (!lookupTableAccount.value) {
        throw new Error("LUT not found")
      }

      // Extract addresses
      const addressList = lookupTableAccount.value.state.addresses.map((pubkey, index) => ({
        index,
        address: pubkey.toBase58(),
      }))

      setAddresses(addressList)
    } catch (err) {
      console.error("Error viewing LUT:", err)
      setError(err instanceof Error ? err.message : "Failed to view LUT")
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-fetch addresses when lutAddress changes and is valid
  useEffect(() => {
    if (lutAddress && lutAddress.length >= 32) {
      handleViewLUT()
    }
  }, [lutAddress, endpoint])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Filter addresses based on search term
  const filteredAddresses = addresses.filter(
    (item) =>
      item.address.toLowerCase().includes(searchTerm.toLowerCase()) || item.index.toString().includes(searchTerm),
  )

  return (
    <Card className="glass-card">
      <CardHeader className="border-b border-slate-700/50 bg-slate-800/30 py-3">
        <div className="flex items-center">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mr-3">
            <Search className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg sm:text-xl">View Look-Up Table</CardTitle>
            <CardDescription className="text-slate-300 text-sm">View addresses stored in a LUT</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                id="lutAddress"
                placeholder="Enter LUT address"
                value={lutAddress}
                onChange={(e) => setLutAddress(e.target.value)}
                className="bg-slate-900/70 border-slate-700/50 focus:border-purple-500 transition-all duration-200"
              />
            </div>
            <div>
              <Button
                onClick={handleViewLUT}
                disabled={isLoading || !lutAddress}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all duration-300"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    View
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Alert variant="destructive" className="border border-red-900/50 bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {addresses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <Badge className="bg-blue-600/30 text-blue-300 border-blue-500/50">
                  {addresses.length} addresses found
                </Badge>
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search addresses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-900/70 border-slate-700/50 focus:border-purple-500 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="border border-slate-700/50 rounded-lg overflow-hidden">
                <div className="max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-800/90 backdrop-blur-sm">
                      <TableRow className="hover:bg-slate-800">
                        <TableHead className="w-16 text-slate-300">Index</TableHead>
                        <TableHead className="text-slate-300">Address</TableHead>
                        <TableHead className="w-16 text-slate-300">Copy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAddresses.length > 0 ? (
                        filteredAddresses.map((item) => (
                          <TableRow key={item.index} className="hover:bg-slate-800/50 border-slate-700/30">
                            <TableCell className="text-slate-400">{item.index}</TableCell>
                            <TableCell className="font-mono text-xs md:text-sm truncate max-w-[200px] md:max-w-[400px] text-slate-300">
                              {item.address}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(item.address)}
                                className="h-8 w-8 hover:bg-slate-700/50"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                            No addresses match your search
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </motion.div>
          )}

          {!addresses.length && !error && !isLoading && lutAddress && (
            <div className="flex flex-col justify-center items-center py-8 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-900/20 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="text-slate-300 font-medium">No addresses found in this LUT</p>
              <p className="text-slate-400 text-sm mt-2 max-w-xs">
                This could be because the LUT is empty or the address is not a valid LUT
              </p>
            </div>
          )}

          {!lutAddress && !isLoading && (
            <div className="flex flex-col justify-center items-center py-8 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 animate-pulse-slow">
                <Search className="h-8 w-8 text-slate-500" />
              </div>
              <p className="text-slate-400">Enter a LUT address to view its contents</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
