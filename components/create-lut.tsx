"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useNetwork } from "./wallet-provider"

interface CreateLUTProps {
  addresses: string
  setAddresses: (addresses: string) => void
}

export default function CreateLUT({ addresses, setAddresses }: CreateLUTProps) {
  const { publicKey, signTransaction } = useWallet()
  const { endpoint } = useNetwork()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleCreateLUT = async () => {
    if (!publicKey || !signTransaction) {
      setError("Wallet not connected")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Parse addresses
      const addressList = addresses
        .split("\n")
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0)

      if (addressList.length === 0) {
        throw new Error("Please enter at least one address")
      }

      // Convert to PublicKey objects
      const publicKeys = addressList.map((addr) => {
        try {
          return new PublicKey(addr)
        } catch (e) {
          throw new Error(`Invalid address: ${addr}`)
        }
      })

      // Connect to Solana
      const connection = new Connection(endpoint, "confirmed")

      // Create LUT instruction
      const [lookupTableInst, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
        authority: publicKey,
        payer: publicKey,
        recentSlot: await connection.getSlot(),
      })

      // Create extend instruction
      const extendInstruction = AddressLookupTableProgram.extendLookupTable({
        payer: publicKey,
        authority: publicKey,
        lookupTable: lookupTableAddress,
        addresses: publicKeys,
      })

      // Create transaction
      const blockhash = await connection.getLatestBlockhash()
      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash.blockhash,
        instructions: [lookupTableInst, extendInstruction],
      }).compileToV0Message()

      const transaction = new VersionedTransaction(messageV0)

      // Sign and send transaction
      const signedTransaction = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())

      await connection.confirmTransaction(signature)

      setSuccess(`LUT created successfully! Address: ${lookupTableAddress.toBase58()}`)
    } catch (err) {
      console.error("Error creating LUT:", err)
      setError(err instanceof Error ? err.message : "Failed to create LUT")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle>Create New Look-Up Table</CardTitle>
        <CardDescription className="text-slate-400">Create a new LUT with a list of addresses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="addresses" className="block text-sm font-medium mb-2">
              Addresses (one per line)
            </label>
            <Textarea
              id="addresses"
              placeholder="Enter Solana addresses here, one per line"
              rows={8}
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
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleCreateLUT}
          disabled={isLoading || !publicKey}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating LUT...
            </>
          ) : (
            "Create LUT"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
