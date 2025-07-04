"use client"

import { useState, useEffect, useRef } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import {
  Connection,
  PublicKey,
  AddressLookupTableProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, AlertTriangle, GitBranch } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useNetwork } from "./wallet-provider"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { CopyButton } from "@/components/ui/copy-button"

interface LUTAddress {
  index: number
  address: string
}

interface DuplicateAnalysis {
  uniqueAddresses: string[]
  duplicateAddresses: string[]
}

interface ExtendLUTProps {
  lutAddress: string
  setLutAddress: (address: string) => void
  addresses: string
  setAddresses: (addresses: string) => void
}

export default function ExtendLUT({ lutAddress, setLutAddress, addresses, setAddresses }: ExtendLUTProps) {
  const { publicKey, signTransaction } = useWallet()
  const { endpoint, network } = useNetwork()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingLut, setIsLoadingLut] = useState(false)
  const [currentAddresses, setCurrentAddresses] = useState<LUTAddress[]>([])
  const [duplicateAnalysis, setDuplicateAnalysis] = useState<DuplicateAnalysis | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Use a ref to track if addresses have been loaded for this LUT address
  const loadedLutRef = useRef<string | null>(null)

  // Fetch current LUT addresses when the LUT address changes
  useEffect(() => {
    const fetchLutAddresses = async () => {
      // Skip if the address is empty or too short
      if (!lutAddress || lutAddress.length < 32) {
        setCurrentAddresses([])
        return
      }

      // Skip if we've already loaded this LUT address
      if (loadedLutRef.current === lutAddress) {
        return
      }

      setIsLoadingLut(true)

      try {
        let lookupTablePubkey: PublicKey
        try {
          lookupTablePubkey = new PublicKey(lutAddress)
        } catch (e) {
          console.error("Invalid LUT address format:", e)
          setCurrentAddresses([])
          setIsLoadingLut(false)
          return
        }

        // Connect to Solana
        const connection = new Connection(endpoint, "confirmed")

        console.log("Fetching LUT account for address:", lookupTablePubkey.toBase58())

        // Fetch LUT account info
        const lookupTableAccount = await connection.getAddressLookupTable(lookupTablePubkey)

        console.log("LUT account response:", lookupTableAccount)

        if (!lookupTableAccount.value) {
          console.log("No LUT found for address:", lookupTablePubkey.toBase58())
          setCurrentAddresses([])
          setIsLoadingLut(false)
          return
        }

        // Extract addresses
        const addressList = lookupTableAccount.value.state.addresses.map((pubkey, index) => ({
          index,
          address: pubkey.toBase58(),
        }))

        console.log(`Found ${addressList.length} addresses in LUT`)
        setCurrentAddresses(addressList)

        // Mark this LUT as loaded
        loadedLutRef.current = lutAddress
      } catch (err) {
        console.error("Error fetching LUT addresses:", err)
        // Don't clear current addresses on error to avoid flickering
      } finally {
        setIsLoadingLut(false)
      }
    }

    fetchLutAddresses()
  }, [lutAddress, endpoint])

  // Reset duplicate analysis when addresses change
  useEffect(() => {
    setDuplicateAnalysis(null)
    setShowConfirmation(false)
  }, [addresses])

  const analyzeAddresses = () => {
    if (!addresses.trim()) {
      toast({
        variant: "destructive",
        title: "Input Error",
        description: "Please enter at least one address to extend the LUT.",
        duration: 4000,
      })
      return false
    }

    // Parse addresses
    const addressList = addresses
      .split("\n")
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0)

    if (addressList.length === 0) {
      toast({
        variant: "destructive",
        title: "Input Error",
        description: "Please enter at least one address to extend the LUT.",
        duration: 4000,
      })
      return false
    }

    // Validate addresses
    try {
      addressList.forEach((addr) => new PublicKey(addr))
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Invalid Address",
        description: "One or more addresses are invalid. Please check your input.",
        duration: 5000,
      })
      return false
    }

    // Get existing addresses as a Set for O(1) lookup
    const existingAddresses = new Set(currentAddresses.map((item) => item.address))

    // Find duplicates
    const duplicates: string[] = []
    const unique: string[] = []

    addressList.forEach((addr) => {
      if (existingAddresses.has(addr)) {
        duplicates.push(addr)
      } else {
        unique.push(addr)
      }
    })

    setDuplicateAnalysis({
      uniqueAddresses: unique,
      duplicateAddresses: duplicates,
    })

    // Show confirmation if there are duplicates or proceed if all are unique
    if (duplicates.length > 0) {
      setShowConfirmation(true)
      return false
    }

    return true
  }

  const handleAnalyzeAndExtend = () => {
    // If already showing confirmation, this is a no-op
    if (showConfirmation) return

    // Analyze addresses and show confirmation if needed
    const canProceed = analyzeAddresses()

    // If no duplicates, proceed with extension
    if (canProceed) {
      handleExtendLUT()
    }
  }

  const handleExtendLUT = async () => {
    if (!publicKey || !signTransaction) {
      toast({
        variant: "destructive",
        title: "Wallet Error",
        description: "Wallet not connected. Please connect your wallet to continue.",
        duration: 4000,
      })
      return
    }

    // If we have duplicate analysis, use only unique addresses
    const addressesToExtend = duplicateAnalysis
      ? duplicateAnalysis.uniqueAddresses
      : addresses
          .split("\n")
          .map((addr) => addr.trim())
          .filter((addr) => addr.length > 0)

    // If no unique addresses to add, show message and return
    if (addressesToExtend.length === 0) {
      toast({
        variant: "destructive",
        title: "No Addresses to Add",
        description: "All provided addresses are already in the LUT.",
        duration: 4000,
      })
      return
    }

    setIsLoading(true)

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

      // Convert to PublicKey objects
      const publicKeys = addressesToExtend.map((addr) => {
        try {
          return new PublicKey(addr)
        } catch (e) {
          throw new Error(`Invalid address: ${addr}`)
        }
      })

      // Connect to Solana
      const connection = new Connection(endpoint, "confirmed")

      // Create extend instruction
      const extendInstruction = AddressLookupTableProgram.extendLookupTable({
        payer: publicKey,
        authority: publicKey,
        lookupTable: lookupTablePubkey,
        addresses: publicKeys,
      })

      // Create transaction
      const blockhash = await connection.getLatestBlockhash()
      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash.blockhash,
        instructions: [extendInstruction],
      }).compileToV0Message()

      const transaction = new VersionedTransaction(messageV0)

      // Sign and send transaction
      const signedTransaction = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())

      await connection.confirmTransaction(signature)

      toast({
        variant: "success",
        title: "LUT Extended Successfully!",
        description: `${publicKeys.length} addresses added to the LUT. Click to view transaction.`,
        duration: 8000,
        transactionHash: signature,
        network: network,
      })

      setShowConfirmation(false)
      setDuplicateAnalysis(null)

      // Refresh the current addresses list
      const lookupTableAccount = await connection.getAddressLookupTable(lookupTablePubkey)
      if (lookupTableAccount.value) {
        const updatedAddressList = lookupTableAccount.value.state.addresses.map((pubkey, index) => ({
          index,
          address: pubkey.toBase58(),
        }))
        setCurrentAddresses(updatedAddressList)
      }
    } catch (err) {
      console.error("Error extending LUT:", err)
      toast({
        variant: "destructive",
        title: "Failed to Extend LUT",
        description: err instanceof Error ? err.message : "An unexpected error occurred while extending the LUT.",
        duration: 6000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left section - Extend LUT form */}
      <Card className="glass-card flex flex-col">
        <CardHeader className="border-b border-slate-700/50 bg-slate-800/30 py-3">
          <div className="flex items-center">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center mr-3">
              <GitBranch className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl">Extend Look-Up Table</CardTitle>
              <CardDescription className="text-slate-300 text-sm">Add addresses to an existing LUT</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4 flex-1">
          <div>
            <label htmlFor="lutAddress" className="block text-sm font-medium mb-1 text-slate-200">
              LUT Address
            </label>
            <Input
              id="lutAddress"
              placeholder="Enter LUT address"
              value={lutAddress}
              onChange={(e) => setLutAddress(e.target.value)}
              className="bg-slate-900/70 border-slate-700/50 focus:border-purple-500 transition-all duration-200"
            />
          </div>

          <div>
            <label htmlFor="addresses" className="block text-sm font-medium mb-1 text-slate-200">
              Addresses to Add (one per line)
            </label>
            <Textarea
              id="addresses"
              placeholder="Enter Solana addresses here, one per line"
              rows={4}
              value={addresses}
              onChange={(e) => setAddresses(e.target.value)}
              className="bg-slate-900/70 border-slate-700/50 focus:border-purple-500 transition-all duration-200"
            />
            <p className="mt-1 text-xs text-slate-400">
              Enter each Solana address on a new line. These addresses will be added to the existing LUT.
            </p>
          </div>

          {/* Conditional confirmation panel */}
          {showConfirmation && duplicateAnalysis && (
            <div className="border border-yellow-900/50 bg-yellow-900/20 rounded-lg p-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div>
                    <span className="font-semibold text-yellow-400">{duplicateAnalysis.duplicateAddresses.length}</span>{" "}
                    duplicate addresses found that are already in the LUT.
                  </div>
                  <div>
                    <span className="font-semibold text-green-400">{duplicateAnalysis.uniqueAddresses.length}</span> new
                    addresses will be added.
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {duplicateAnalysis.duplicateAddresses.slice(0, 3).map((addr, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-yellow-900/30 border-yellow-700/50 text-xs font-mono"
                      >
                        {addr.substring(0, 4)}...{addr.substring(addr.length - 4)}
                      </Badge>
                    ))}
                    {duplicateAnalysis.duplicateAddresses.length > 3 && (
                      <Badge variant="outline" className="bg-yellow-900/30 border-yellow-700/50">
                        +{duplicateAnalysis.duplicateAddresses.length - 3} more
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowConfirmation(false)}
                      className="border-yellow-700/50 hover:bg-yellow-900/30"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleExtendLUT}
                      disabled={duplicateAnalysis.uniqueAddresses.length === 0}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Proceed with {duplicateAnalysis.uniqueAddresses.length} addresses
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-slate-700/50 bg-slate-800/30 px-6 py-3 mt-auto">
          <Button
            onClick={handleAnalyzeAndExtend}
            disabled={isLoading || !publicKey || !lutAddress || addresses.trim() === ""}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extending LUT...
              </>
            ) : showConfirmation ? (
              "Analyze Addresses"
            ) : (
              "Extend LUT"
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Right section - Current LUT addresses */}
      <Card className="glass-card">
        <CardHeader className="border-b border-slate-700/50 bg-slate-800/30 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mr-3">
                <GitBranch className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Current LUT Addresses</CardTitle>
                <CardDescription className="text-slate-300 text-sm">
                  Addresses currently stored in the LUT
                </CardDescription>
              </div>
            </div>
            {currentAddresses.length > 0 && (
              <Badge className="bg-blue-600/30 text-blue-300 border-blue-500/50">
                {currentAddresses.length} addresses
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingLut ? (
            <div className="flex flex-col justify-center items-center py-8 px-6">
              <Loader2 className="h-10 w-10 animate-spin text-purple-500 mb-4" />
              <p className="text-slate-400">Loading addresses...</p>
            </div>
          ) : lutAddress ? (
            currentAddresses.length > 0 ? (
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-800/90 backdrop-blur-sm">
                    <TableRow className="hover:bg-slate-800">
                      <TableHead className="w-16 text-slate-300">Index</TableHead>
                      <TableHead className="text-slate-300">Address</TableHead>
                      <TableHead className="w-16 text-slate-300">Copy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentAddresses.map((item) => (
                      <TableRow key={item.index} className="hover:bg-slate-800/50 border-slate-700/30">
                        <TableCell className="text-slate-400">{item.index}</TableCell>
                        <TableCell className="font-mono text-xs md:text-sm truncate max-w-[100px] md:max-w-[200px] text-slate-300">
                          {item.address}
                        </TableCell>
                        <TableCell>
                          <CopyButton text={item.address} className="h-8 w-8 hover:bg-slate-700/50" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center py-8 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-900/20 flex items-center justify-center mb-4">
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
                <p className="text-slate-300 font-medium">No addresses found in this LUT</p>
                <p className="text-slate-400 text-sm mt-2 max-w-xs">
                  This could be because the LUT is empty or the address is not a valid LUT
                </p>
              </div>
            )
          ) : (
            <div className="flex flex-col justify-center items-center py-8 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 animate-pulse-slow">
                <GitBranch className="h-8 w-8 text-slate-500" />
              </div>
              <p className="text-slate-400">Enter a LUT address to view current addresses</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
