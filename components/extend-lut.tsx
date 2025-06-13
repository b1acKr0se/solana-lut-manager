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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2, Copy, AlertTriangle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useNetwork } from "./wallet-provider"
import { Badge } from "@/components/ui/badge"

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
  const { endpoint } = useNetwork()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingLut, setIsLoadingLut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
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
      setError(null)

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
      setError("Please enter at least one address")
      return false
    }

    // Parse addresses
    const addressList = addresses
      .split("\n")
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0)

    if (addressList.length === 0) {
      setError("Please enter at least one address")
      return false
    }

    // Validate addresses
    try {
      addressList.forEach((addr) => new PublicKey(addr))
    } catch (e) {
      setError("One or more addresses are invalid")
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
    setError(null)
    setSuccess(null)

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
      setError("Wallet not connected")
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
      setError("No new addresses to add")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

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

      setSuccess(`LUT extended successfully! ${publicKeys.length} addresses added.`)
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
      setError(err instanceof Error ? err.message : "Failed to extend LUT")
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left section - Extend LUT form */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Extend Look-Up Table</CardTitle>
          <CardDescription className="text-slate-400">Add addresses to an existing LUT</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="lutAddress" className="block text-sm font-medium mb-2">
                LUT Address
              </label>
              <Input
                id="lutAddress"
                placeholder="Enter LUT address"
                value={lutAddress}
                onChange={(e) => setLutAddress(e.target.value)}
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div>
              <label htmlFor="addresses" className="block text-sm font-medium mb-2">
                Addresses to Add (one per line)
              </label>
              <Textarea
                id="addresses"
                placeholder="Enter Solana addresses here, one per line"
                rows={6}
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
                className="bg-slate-900 border-slate-700"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-900 border-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {showConfirmation && duplicateAnalysis && (
              <Alert className="bg-yellow-900 border-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p>
                    <strong>{duplicateAnalysis.duplicateAddresses.length}</strong> duplicate addresses found that are
                    already in the LUT.
                  </p>
                  <p>
                    <strong>{duplicateAnalysis.uniqueAddresses.length}</strong> new addresses will be added.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {duplicateAnalysis.duplicateAddresses.slice(0, 3).map((addr, i) => (
                      <Badge key={i} variant="outline" className="bg-yellow-800 text-xs font-mono">
                        {addr.substring(0, 4)}...{addr.substring(addr.length - 4)}
                      </Badge>
                    ))}
                    {duplicateAnalysis.duplicateAddresses.length > 3 && (
                      <Badge variant="outline" className="bg-yellow-800">
                        +{duplicateAnalysis.duplicateAddresses.length - 3} more
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowConfirmation(false)}
                      className="border-yellow-600"
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
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleAnalyzeAndExtend}
            disabled={isLoading || !publicKey || !lutAddress || addresses.trim() === ""}
            className="w-full bg-purple-600 hover:bg-purple-700"
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
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Current LUT Addresses</CardTitle>
          <CardDescription className="text-slate-400">Addresses currently stored in the LUT</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLut ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : lutAddress ? (
            currentAddresses.length > 0 ? (
              <div className="space-y-4">
                <div className="border border-slate-700 rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-slate-800">
                        <TableHead className="w-16">Index</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="w-16">Copy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentAddresses.map((item) => (
                        <TableRow key={item.index} className="hover:bg-slate-800">
                          <TableCell>{item.index}</TableCell>
                          <TableCell className="font-mono text-xs md:text-sm truncate max-w-[100px] md:max-w-[200px]">
                            {item.address}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(item.address)}
                              className="h-8 w-8"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-sm text-slate-400">Total addresses: {currentAddresses.length}</div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-slate-300">No addresses found in this LUT</p>
                <p className="text-slate-400 text-sm mt-1">
                  This could be because the LUT is empty or the address is not a valid LUT
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-slate-400">Enter a LUT address to view current addresses</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
