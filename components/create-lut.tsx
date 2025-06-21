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
import { Loader2, Database } from "lucide-react"
import { useNetwork } from "./wallet-provider"
import { useToast } from "@/components/ui/use-toast"
import { CopyButton } from "@/components/ui/copy-button"

interface CreateLUTProps {
  addresses: string
  setAddresses: (addresses: string) => void
}

export default function CreateLUT({ addresses, setAddresses }: CreateLUTProps) {
  const { publicKey, signTransaction } = useWallet()
  const { endpoint, network } = useNetwork()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [createdLutAddress, setCreatedLutAddress] = useState<string | null>(null)

  const handleCreateLUT = async () => {
    if (!publicKey || !signTransaction) {
      toast({
        variant: "destructive",
        title: "Wallet Error",
        description: "Wallet not connected. Please connect your wallet to continue.",
        duration: 4000,
      })
      return
    }

    setIsLoading(true)
    setCreatedLutAddress(null)

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

      const lutAddress = lookupTableAddress.toBase58()
      setCreatedLutAddress(lutAddress)

      // Show success toast with transaction hash
      toast({
        variant: "success",
        title: "LUT Created Successfully!",
        description: `Your Look-Up Table has been created with ${publicKeys.length} addresses. Click to view transaction.`,
        duration: 8000,
        transactionHash: signature,
        network: network,
      })
    } catch (err) {
      console.error("Error creating LUT:", err)
      toast({
        variant: "destructive",
        title: "Failed to Create LUT",
        description: err instanceof Error ? err.message : "An unexpected error occurred while creating the LUT.",
        duration: 6000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader className="border-b border-slate-700/50 bg-slate-800/30 py-3">
        <div className="flex items-center">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center mr-3">
            <Database className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg sm:text-xl">Create New Look-Up Table</CardTitle>
            <CardDescription className="text-slate-300 text-sm">
              Create a new LUT with a list of addresses
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div>
            <label htmlFor="addresses" className="block text-sm font-medium mb-2 text-slate-200">
              Addresses (one per line)
            </label>
            <Textarea
              id="addresses"
              placeholder="Enter Solana addresses here, one per line"
              rows={6}
              value={addresses}
              onChange={(e) => setAddresses(e.target.value)}
              className="bg-slate-900/70 border-slate-700/50 focus:border-purple-500 transition-all duration-200"
            />
            <p className="mt-2 text-xs text-slate-400">
              Enter each Solana address on a new line. These addresses will be added to your new LUT.
            </p>
          </div>

          {createdLutAddress && (
            <div className="flex items-center mt-2 bg-slate-800/50 p-3 rounded-md border border-green-500/30">
              <span className="text-xs font-mono text-slate-300 truncate flex-1">Created: {createdLutAddress}</span>
              <CopyButton text={createdLutAddress} className="h-8 w-8 hover:bg-slate-700/50" />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t border-slate-700/50 bg-slate-800/30 px-6 py-3">
        <Button
          onClick={handleCreateLUT}
          disabled={isLoading || !publicKey || !addresses.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
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
