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
      className="min-h-screen flex flex-col items-center justify-center px-2"
    >
      {!isReady ? (
        <p>Loading...</p>
      ) : (
        <>
          {!address ? (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-400 to-indigo-600 text-white p-4">
              <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-2xl max-w-md w-full">
                <h1 className="text-3xl font-bold mb-6 text-center">
                  Welcome to Solana Fees Checker
                </h1>
                <p className="text-lg mb-4 text-center">
                  Hello, {username ? username : "User"}! Ready to explore your
                  Solana transaction fees?
                </p>
                <div className="space-y-4">
                  <Button
                    onClick={handleConnectWallet}
                    className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                  >
                    Connect Wallet
                  </Button>
                  <p className="text-sm text-center opacity-75">
                    Connect your Solana wallet to get started and check your
                    transaction fees.
                  </p>
                </div>
                {errorMessage && (
                  <div className="mt-4 p-3 bg-red-500 bg-opacity-25 border border-red-600 rounded-lg">
                    <p className="text-sm text-center text-red-100">
                      {errorMessage}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-8 text-center">
                <h2 className="text-xl font-semibold mb-3">
                  Why use Solana Fees Checker?
                </h2>
                <ul className="space-y-2">
                  <li>✅ Track your Solana transaction fees</li>
                  <li>✅ Understand your spending patterns</li>
                  <li>✅ Potentially mint exclusive NFTs</li>
                  <li>✅ Optimize your future transactions</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              <FadeInOutTransition
                show={
                  (state === "loading" || state === "resolving") &&
                  !isElementLeaving
                }
                beforeLeave={setElementLeaving}
                afterLeave={setElementNotLeaving}
              >
                <Progress state={state} progress={progress} />
                <Spotlight opacity={0.1} size={spotlight1Size} />
                <Spotlight opacity={0.2} size={spotlight2Size} />
              </FadeInOutTransition>
              <Transition
                show={state === "done" && !isElementLeaving}
                afterEnter={() => window.scrollTo(0, 0)}
                beforeLeave={setElementLeaving}
                afterLeave={setElementNotLeaving}
                enter="transition-transform duration-200 ease-in"
                enterFrom="translate-y-full"
                enterTo="translate-y-0"
                leave="transition-transform duration-200 ease-out"
                leaveFrom="translate-y-0"
                leaveTo="translate-y-full"
                className={clx(
                  "grow",
                  "flex",
                  "flex-col",
                  "w-full",
                  "sm:max-w-xl md:max-w-2xl lg:max-w-4xl",
                  "mx-auto",
                  "mt-2 sm:mt-4 md:mt-8",
                  "pt-2 sm:pt-4 md:pt-8",
                  "px-2 sm:px-4 md:px-8",
                  "rounded-t-lg",
                  "bg-white",
                  "shadow-2xl"
                )}
              >
                <div className="grow">
                  <Result
                    pricesAndFees={pricesAndFees as PricesAndFees}
                    summary={summary as WalletResult}
                    addWallet={() => {}} // Add a no-op function or implement as needed
                    reset={resetResult} // Use the resetResult function from useTransactions
                    wallets={[]} // Add an empty array or populate with actual wallets if available
                  />
                  {isLoading ? (
                    <p>Loading...</p>
                  ) : isEligible ? (
                    <div className="flex flex-col items-center">
                      <p className="text-green-500 mt-4">
                        🎉 Congratulations! You're eligible to mint the NFT.
                      </p>
                      <Button
                        onClick={mintNFT}
                        disabled={transactionStatus === "Minting NFT..."}
                      >
                        Mint NFT
                      </Button>
                    </div>
                  ) : (
                    <p className="text-red-500 mt-4">
                      You are not eligible to mint the NFT. You need to spend at
                      least $0.001 in transaction fees.
                    </p>
                  )}
                  {transactionStatus && (
                    <p
                      className={`mt-4 ${
                        transactionStatus.includes("successfully")
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {transactionStatus}
                    </p>
                  )}
                  {errorMessage && (
                    <p className="mt-2 text-red-500">{errorMessage}</p>
                  )}
                </div>
              </Transition>
              {state === "done" ? (
                <Confetti
                  gravity={0.5}
                  height={screenHeight}
                  numberOfPieces={200}
                  recycle={false}
                  run={state === "done"}
                  width={screenWidth}
                />
              ) : null}
            </>
          )}
        </>
      )}
    </main>
  );
};

export { SolFeesApp };
