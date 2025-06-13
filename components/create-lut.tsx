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
import { Loader2, AlertCircle, CheckCircle2, Database, Copy } from "lucide-react"
import { useNetwork } from "./wallet-provider"
import { motion } from "framer-motion"

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
  const [createdLutAddress, setCreatedLutAddress] = useState<string | null>(null)

  const handleCreateLUT = async () => {
    if (!publicKey || !signTransaction) {
      setError("Wallet not connected")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)
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

      setCreatedLutAddress(lookupTableAddress.toBase58())
      setSuccess(`LUT created successfully!`)
    } catch (err) {
      console.error("Error creating LUT:", err)
      setError(err instanceof Error ? err.message : "Failed to create LUT")
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center mr-4">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>Create New Look-Up Table</CardTitle>
            <CardDescription className="text-slate-300">Create a new LUT with a list of addresses</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="addresses" className="block text-sm font-medium mb-2 text-slate-200">
              Addresses (one per line)
            </label>
            <Textarea
              id="addresses"
              placeholder="Enter Solana addresses here, one per line"
              rows={8}
              value={addresses}
              onChange={(e) => setAddresses(e.target.value)}
              className="bg-slate-900/70 border-slate-700/50 focus:border-purple-500 transition-all duration-200"
            />
            <p className="mt-2 text-xs text-slate-400">
              Enter each Solana address on a new line. These addresses will be added to your new LUT.
            </p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Alert variant="destructive" className="border border-red-900/50 bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {success && createdLutAddress && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Alert className="border border-green-900/50 bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="flex flex-col space-y-2">
                  <span className="text-green-400">{success}</span>
                  <div className="flex items-center mt-2 bg-slate-800/50 p-2 rounded-md">
                    <span className="text-xs font-mono text-slate-300 truncate flex-1">{createdLutAddress}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(createdLutAddress)}
                      className="h-8 w-8 hover:bg-slate-700/50"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t border-slate-700/50 bg-slate-800/30 px-6 py-4">
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
