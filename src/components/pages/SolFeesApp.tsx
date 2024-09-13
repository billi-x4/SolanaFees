"use client";

import { Transition } from "@headlessui/react";
import clx from "classnames";
import { useEffect, useMemo, useState } from "react";
import Confetti from "react-confetti";
import { useMeasure } from "react-use";
import Decimal from "decimal.js";

import { FadeInOutTransition, Spotlight } from "@/components/atoms";
import { ErrorDisplay, Progress } from "@/components/molecules";
import { Result } from "@/components/templates";
import { usePricesAndFees, useTransactions } from "@/hooks";
import { type PricesAndFees, type WalletResult } from "@/types";
import { Button } from "../ui/button";

const SolFeesApp = () => {
  // State variables
  const [isReady, setIsReady] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hooks
  const { pricesAndFees } = usePricesAndFees();
  const {
    error,
    progress,
    reset: resetResult,
    summary,
    state,
  } = useTransactions(address);

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
                Welcome, {username || "User"}! Ready to explore your Solana
                transaction fees?
              </p>
              <Button
                onClick={() => {}}
                className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50"
              >
                Connect Wallet
              </Button>
              {errorMessage && (
                <div className="mt-4 p-3 bg-red-500 bg-opacity-25 border border-red-400 rounded-lg">
                  <p className="text-sm text-center text-red-100">
                    {errorMessage}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <FadeInOutTransition
                show={
                  (state === "loading" || state === "resolving") &&
                  !isElementLeaving
                }
                beforeLeave={setElementLeaving}
                afterLeave={setElementNotLeaving}
              >
                <div className="text-center">
                  <Progress state={state} progress={progress} />
                  <p className="mt-4 text-lg text-purple-200">
                    Analyzing your transaction fees...
                  </p>
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
                  <h2 className="text-3xl font-bold mb-6 text-center text-purple-200">
                    Your Solana Fee Summary
                  </h2>
                  <Result
                    pricesAndFees={pricesAndFees as PricesAndFees}
                    summary={summary as WalletResult}
                    addWallet={() => {}}
                    reset={resetResult}
                    wallets={[]}
                  />

                  {errorMessage && (
                    <div className="mt-4 p-3 bg-red-500 bg-opacity-25 border border-red-400 rounded-lg">
                      <p className="text-sm text-center text-red-100">
                        {errorMessage}
                      </p>
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
                  colors={["#8B5CF6", "#6366F1", "#EC4899", "#10B981"]}
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
