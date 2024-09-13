"use client";

import React, { useMemo, useState, useEffect } from "react";
import BigNumber from "bignumber.js";
import { IoInformationCircle } from "react-icons/io5";
import { GAS_DENOMINATOR, TX_CAP } from "@/constants";
import {
  type WalletsSummary,
  type WalletResult,
  PricesAndFees,
} from "@/types";
import { DateDisplay, NoWrap, NumberDisplay } from "../atoms";

type ResultProps = {
  addWallet: () => void;
  reset: () => void;
  summary: WalletResult;
  wallets: string[];
  pricesAndFees: PricesAndFees;
};

const Result: React.FC<ResultProps> = ({
  pricesAndFees,
  addWallet,
  reset,
  summary,
  wallets,
}) => {
  const [currentSolPrice, setCurrentSolPrice] = useState<number | null>(null);
  const [canMintNFT, setCanMintNFT] = useState<boolean>(false);
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [mintingError, setMintingError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSolanaPrice = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const priceData = await response.json();
        setCurrentSolPrice(priceData.solana.usd);
      } catch (error) {
        console.error("Failed to fetch Solana price:", error);
      }
    };

    fetchSolanaPrice();
    const interval = setInterval(fetchSolanaPrice, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, []);

  const data = useMemo(() => {
    let data: Partial<WalletsSummary> = {};
    if (summary && summary.aggregation) {
      data = {
        firstTransaction: new Date(summary.aggregation.firstTransactionTS),
        solFees: new BigNumber(summary.aggregation.feesTotal)
          .multipliedBy(GAS_DENOMINATOR)
          .decimalPlaces(5)
          .toNumber(),
        txCount: summary.aggregation.transactionsCount,
        txCountUnpaid: summary.aggregation.unpaidTransactionsCount,
        solAvgFee: new BigNumber(summary.aggregation.feesAvg)
          .multipliedBy(GAS_DENOMINATOR)
          .decimalPlaces(6)
          .toNumber(),
      };
    }
    return data;
  }, [summary]);

  const currentUsdFees = useMemo(() => {
    if (currentSolPrice && data.solFees) {
      return new BigNumber(data.solFees)
        .multipliedBy(currentSolPrice)
        .decimalPlaces(2)
        .toNumber();
    }
    return null;
  }, [currentSolPrice, data.solFees]);

  useEffect(() => {
    if (currentUsdFees !== null) {
      setCanMintNFT(currentUsdFees >= 0.001);
    }
  }, [currentUsdFees]);

  const currentUsdAvgFee = useMemo(() => {
    if (currentSolPrice && data.solAvgFee) {
      return new BigNumber(data.solAvgFee)
        .multipliedBy(currentSolPrice)
        .decimalPlaces(6)
        .toNumber();
    }
    return null;
  }, [currentSolPrice, data.solAvgFee]);

  const handleMintNFT = async () => {
    if (!canMintNFT) return;

    setIsMinting(true);
    setMintingError(null);

    try {
      // Implement your NFT minting logic here
      // This is a placeholder - replace with actual minting code
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulating minting process
      console.log("NFT minted successfully!");
      // You might want to update some state or trigger a refresh here
    } catch (error) {
      console.error("Failed to mint NFT:", error);
      setMintingError("Failed to mint NFT. Please try again.");
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-purple-200 mb-6">
        Your Solana Transaction Summary
      </h2>

      {(data.txCount as number) >= TX_CAP && (
        <div className="bg-blue-500 bg-opacity-20 border border-blue-400 rounded-lg p-4 flex items-center">
          <IoInformationCircle
            className="text-blue-300 mr-3 flex-shrink-0"
            size={24}
          />
          <p className="text-blue-100 text-sm">
            We're currently capping at {TX_CAP.toLocaleString()} transactions.
            We're working on increasing this limit!
          </p>
        </div>
      )}

      <div className="bg-white bg-opacity-10 rounded-lg p-6 shadow-lg">
        <h3 className="text-2xl font-bold text-purple-200 mb-4">Overview</h3>
        <p className="text-lg text-purple-100 mb-4">
          {wallets.length > 1 ? (
            <>
              Across your{" "}
              <span className="font-bold text-white">
                {wallets.length} wallets
              </span>
              ,{" "}
            </>
          ) : (
            <>Your wallet has </>
          )}
          you've spent{" "}
          <NoWrap className="font-bold text-white">
            ◎ <NumberDisplay val={data.solFees as number} />
          </NoWrap>{" "}
          in fees for{" "}
          <span className="font-bold text-white">
            {data.txCount?.toLocaleString()} transactions
          </span>
          .
        </p>
        {currentUsdFees !== null && (
          <p className="text-lg text-purple-100">
            That's equivalent to{" "}
            <NoWrap className="font-bold text-white">
              $ <NumberDisplay val={currentUsdFees} />
            </NoWrap>{" "}
            at current prices.
          </p>
        )}
      </div>

      <div className="bg-white bg-opacity-10 rounded-lg p-6 shadow-lg">
        <h3 className="text-2xl font-bold text-purple-200 mb-4">
          Transaction Details
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-purple-300">Total Transactions:</span>
            <span className="text-white font-semibold">
              {data.txCount?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-purple-300">Paid Transactions:</span>
            <span className="text-white font-semibold">
              {(
                (data.txCount as number) - (data.txCountUnpaid as number)
              ).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-purple-300">Unpaid Transactions:</span>
            <span className="text-white font-semibold">
              {data.txCountUnpaid?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-purple-300">
              Average Fee per Transaction:
            </span>
            <div className="text-right">
              <NoWrap className="text-white font-semibold">
                ◎ <NumberDisplay val={data.solAvgFee as number} />
              </NoWrap>
              {currentUsdAvgFee !== null && (
                <NoWrap className="text-purple-400 text-sm">
                  ($ <NumberDisplay val={currentUsdAvgFee} />)
                </NoWrap>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-purple-300">First Transaction Date:</span>
            <span className="text-white font-semibold">
              <DateDisplay val={data.firstTransaction as Date} />
            </span>
          </div>
        </div>
      </div>

      {wallets.length > 1 && (
        <div className="bg-white bg-opacity-10 rounded-lg p-6 shadow-lg">
          <h3 className="text-2xl font-bold text-purple-200 mb-4">
            Wallet Information
          </h3>
          <p className="text-purple-100">
            This summary includes data from{" "}
            <span className="font-semibold text-white">{wallets.length}</span>{" "}
            connected wallets.
          </p>
        </div>
      )}

      <div className="bg-white bg-opacity-10 rounded-lg p-6 shadow-lg">
        <h3 className="text-2xl font-bold text-purple-200 mb-4">NFT Minting</h3>
        {canMintNFT ? (
          <div>
            <p className="text-purple-100 mb-4">
              Congratulations! You've spent at least $0.001 in transaction fees.
              You can now mint your NFT.
            </p>
            <button
              onClick={handleMintNFT}
              disabled={isMinting}
              className={`bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded ${
                isMinting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isMinting ? 'Minting...' : 'Mint NFT'}
            </button>
            {mintingError && (
              <p className="text-red-500 mt-2">{mintingError}</p>
            )}
          </div>
        ) : (
          <p className="text-purple-100">
            Almost there! You need to spend at least $0.001 in transaction fees to be eligible.
            <br />
            Current spend: ${currentUsdFees !== null ? currentUsdFees.toFixed(3) : "0.000"}
            <br />
            Keep using your Solana wallet and check back soon!
          </p>
        )}
      </div>

    </div>
  );
};

export { Result };
