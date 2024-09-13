"use client";

import { Transition } from "@headlessui/react";
import clx from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import Confetti from "react-confetti";
import { useMeasure } from "react-use";
import Decimal from 'decimal.js';

import { FadeInOutTransition, Spotlight } from "@/components/atoms";
import { ErrorDisplay, Progress } from "@/components/molecules";
import { Result } from "@/components/templates";
import { usePricesAndFees, useTransactions } from "@/hooks";
import { type PricesAndFees, type WalletResult } from "@/types";

// Import CanvasClient and related functions
import { CanvasClient } from "@dscvr-one/canvas-client-sdk";
import { registerCanvasWallet } from "@dscvr-one/canvas-wallet-adapter";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { signerIdentity, generateSigner } from "@metaplex-foundation/umi";
import { umiUseNoopSigner } from "@/lib/umi";
import { PublicKey } from "@solana/web3.js";
import { create, mplCore } from "@metaplex-foundation/mpl-core";
import { setComputeUnitPrice } from "@metaplex-foundation/mpl-toolbox";
import base58 from "bs58";

// Import UI components
import { Button } from "@/components/ui/button";

const SolFeesApp = () => {
  // State variables
  const [isReady, setIsReady] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isEligible, setIsEligible] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refs
  const canvasClientRef = useRef<CanvasClient | null>(null);
  const umiRef = useRef<any>(null);

  // Hooks
  const { pricesAndFees } = usePricesAndFees();
  const {
    error,
    progress,
    reset: resetResult,
    summary,
    state,
  } = useTransactions(address);

  // Effect to initialize CanvasClient
  useEffect(() => {
    console.log("Initializing CanvasClient...");
    const client = new CanvasClient();
    registerCanvasWallet(client);
    canvasClientRef.current = client;
    console.log("CanvasClient initialized and wallet registered:", client);

    const startClient = async () => {
      console.log("Waiting for CanvasClient to be ready...");
      const response = await client.ready();
      if (response) {
        console.log("CanvasClient is ready:", response);
        setIsReady(true);

        const user: any = response.untrusted.user;
        console.log("User information:", user);
        setUsername(user.username || "User");
      }
    };

    startClient();

    return () => {
      console.log("Destroying CanvasClient...");
      client.destroy();
    };
  }, []);

  // Effect to check eligibility based on transaction fees
  useEffect(() => {
    setIsLoading(true);
    try {
      if (summary?.fees?.total && pricesAndFees?.solanaPrice) {
        const totalFeesInSOL = summary.fees.total;
        const solPrice = pricesAndFees.solanaPrice;
        const totalFeesInUSD = new Decimal(totalFeesInSOL).times(solPrice);
        setIsEligible(totalFeesInUSD.gte(0.001));
      } else {
        setIsEligible(false);
      }
    } catch (error) {
      console.error("Error calculating eligibility:", error);
      setIsEligible(false);
    }
    setIsLoading(false);
  }, [summary, pricesAndFees]);

  // Function to handle wallet connection
  const handleConnectWallet = async () => {
    if (!canvasClientRef.current) {
      console.error("CanvasClient is not initialized");
      setErrorMessage("CanvasClient is not initialized. Please try again.");
      return;
    }

    try {
      console.log("Connecting wallet...");
      const response = await canvasClientRef.current.connectWallet(
        "solana:101" // Mainnet
      );
      console.log("Wallet connect response:", response);
      if (response && response.untrusted.success) {
        const publicKey = new PublicKey(response.untrusted.address);
        console.log("Connected wallet public key:", publicKey.toString());
        setAddress(publicKey.toString());
        setErrorMessage(null);

        // Initialize Umi instance
        console.log("Initializing Umi with NoopSigner...");
        const umi = createUmi("https://api.mainnet-beta.solana.com")
          .use(mplCore())
          .use(signerIdentity(umiUseNoopSigner(publicKey.toString())));
        umiRef.current = umi;
        console.log("Umi initialized:", umi);
      } else {
        console.error("Failed to connect wallet.");
        setErrorMessage("Failed to connect wallet. Please try again.");
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      setErrorMessage("Failed to connect wallet. Please try again.");
    }
  };

  // Function to mint NFT
  const mintNFT = async () => {
    if (!address) {
      console.error("No wallet connected. Cannot mint NFT.");
      setErrorMessage(
        "Wallet is not connected. Please connect your wallet first."
      );
      return;
    }

    console.log("Starting NFT minting process...");
    setTransactionStatus("Minting NFT...");
    setErrorMessage(null);

    try {
      console.log("Generating signer for asset...");
      const assetAddress = generateSigner(umiRef.current);
      console.log("Asset address:", assetAddress);
      
      console.log("Building transaction...");
      let transactionBuilder = await create(umiRef.current, {
        asset: assetAddress,
        name: "Solana Fees Checker NFT",
        uri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/metadata.json",
      });
      console.log("Transaction builder created:", transactionBuilder);

      transactionBuilder = transactionBuilder.prepend(
        setComputeUnitPrice(umiRef.current, {
          microLamports: 10_000,
        })
      );
      console.log("Compute unit price set on transaction.");

      console.log("Building and signing the transaction...");
      const tx = await transactionBuilder.buildAndSign(umiRef.current);
      console.log("Transaction built and signed:", tx);

      console.log("Serializing transaction...");
      const serializedTx = umiRef.current?.transactions.serialize(tx);
      console.log("Serialized transaction:", serializedTx);

      console.log("Encoding transaction in base58...");
      const base58EncodedTx = base58.encode(serializedTx);
      console.log("Base58 encoded transaction:", base58EncodedTx);

      console.log("Sending transaction to DSCVR...");
      const results = await canvasClientRef.current?.signAndSendTransaction({
        unsignedTx: base58EncodedTx,
        awaitCommitment: "confirmed",
        chainId: "solana:101",
      });
      console.log("Transaction sent. Results:", results);

      if (results?.untrusted.success) {
        console.log("NFT minted successfully:", results);
        setTransactionStatus("NFT minted successfully!");
        setTimeout(() => {
          setTransactionStatus(null);
        }, 3000);
      } else {
        throw new Error("Transaction failed.");
      }
    } catch (error: any) {
      console.error("Minting error:", error);
      console.log("Detailed error stack trace:", error.stack);
      setTransactionStatus("Minting failed.");
      setErrorMessage(
        "An error occurred during the minting process. Please try again."
      );
    }
  };

  // UI and Rendering Logic
  const [measureRef, { width: screenWidth, height: screenHeight }] =
    useMeasure<HTMLElement>();

  const [isElementLeaving, setIsElementLeaving] = useState(false);
  const setElementLeaving = () => setIsElementLeaving(true);
  const setElementNotLeaving = () => setIsElementLeaving(false);

  let spotlight1Size = screenWidth / 2;
  let spotlight2Size = screenWidth / 3;
  spotlight1Size = spotlight1Size > 400 ? 400 : spotlight1Size;
  spotlight2Size = spotlight2Size > 200 ? 200 : spotlight2Size;

  return (
    <main
      ref={measureRef}
      className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-800 text-white"
    >
      {!isReady ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-300"></div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8">
          {!address ? (
            <div className="max-w-md mx-auto bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-2xl">
              <h1 className="text-4xl font-bold mb-6 text-center text-purple-200">
                Solana Fees Checker
              </h1>
              <p className="text-lg mb-8 text-center text-purple-100">
                Welcome, {username || "User"}! Ready to explore your Solana transaction fees?
              </p>
              <Button
                onClick={handleConnectWallet}
                className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50"
              >
                Connect Wallet
              </Button>
              {errorMessage && (
                <div className="mt-4 p-3 bg-red-500 bg-opacity-25 border border-red-400 rounded-lg">
                  <p className="text-sm text-center text-red-100">{errorMessage}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <FadeInOutTransition
                show={(state === "loading" || state === "resolving") && !isElementLeaving}
                beforeLeave={setElementLeaving}
                afterLeave={setElementNotLeaving}
              >
                <div className="text-center">
                  <Progress state={state} progress={progress} />
                  <p className="mt-4 text-lg text-purple-200">Analyzing your transaction fees...</p>
                </div>
              </FadeInOutTransition>
              
              <Transition
                show={state === "done" && !isElementLeaving}
                enter="transition-opacity duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-2xl">
                  <h2 className="text-3xl font-bold mb-6 text-center text-purple-200">Your Solana Fee Summary</h2>
                  <Result
                    pricesAndFees={pricesAndFees as PricesAndFees}
                    summary={summary as WalletResult}
                    addWallet={() => {}}
                    reset={resetResult}
                    wallets={[]}
                  />
                  
                  {isLoading ? (
                    <div className="flex justify-center mt-6">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-300"></div>
                    </div>
                  ) : isEligible ? (
                    <div className="mt-8 text-center">
                      <p className="text-xl font-semibold text-green-300 mb-4">
                        🎉 Congratulations! You're eligible to mint the NFT.
                      </p>
                      <Button
                        onClick={mintNFT}
                        disabled={transactionStatus === "Minting NFT..."}
                        className="py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {transactionStatus === "Minting NFT..." ? "Minting..." : "Mint NFT"}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-8 text-center">
                      <p className="text-xl font-semibold text-yellow-300 mb-4">
                        Almost there! You need to spend at least $0.001 in transaction fees to be eligible.
                      </p>
                      <p className="text-md text-purple-200">
                        Keep using your Solana wallet and check back soon!
                      </p>
                    </div>
                  )}
                  
                  {transactionStatus && (
                    <div className={`mt-4 p-3 rounded-lg ${
                      transactionStatus.includes("successfully") ? "bg-green-500 bg-opacity-25" : "bg-red-500 bg-opacity-25"
                    }`}>
                      <p className="text-center font-semibold">
                        {transactionStatus}
                      </p>
                    </div>
                  )}
                  
                  {errorMessage && (
                    <div className="mt-4 p-3 bg-red-500 bg-opacity-25 border border-red-400 rounded-lg">
                      <p className="text-sm text-center text-red-100">{errorMessage}</p>
                    </div>
                  )}
                </div>
              </Transition>
              
              {state === "done" && (
                <Confetti
                  gravity={0.1}
                  numberOfPieces={200}
                  recycle={false}
                  run={true}
                  width={screenWidth}
                  height={screenHeight}
                  colors={['#8B5CF6', '#6366F1', '#EC4899', '#10B981']}
                />
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export { SolFeesApp };
