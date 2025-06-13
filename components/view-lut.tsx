"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Connection, PublicKey } from "@solana/web3.js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Copy } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useNetwork } from "./wallet-provider"

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

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle>View Look-Up Table</CardTitle>
        <CardDescription className="text-slate-400">View addresses stored in a LUT</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Enter LUT address"
                value={lutAddress}
                onChange={(e) => setLutAddress(e.target.value)}
                className="bg-slate-900 border-slate-700"
              />
            </div>
            <Button onClick={handleViewLUT} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "View"
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {addresses.length > 0 && (
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
                  {addresses.map((item) => (
                    <TableRow key={item.index} className="hover:bg-slate-800">
                      <TableCell>{item.index}</TableCell>
                      <TableCell className="font-mono text-xs md:text-sm truncate max-w-[200px] md:max-w-[400px]">
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
          )}

          {addresses.length > 0 && <div className="text-sm text-slate-400">Total addresses: {addresses.length}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
