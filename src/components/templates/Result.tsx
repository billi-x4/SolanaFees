"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import BigNumber from "bignumber.js";
import { IoInformationCircle } from "react-icons/io5";
import { GAS_DENOMINATOR, TX_CAP } from "@/constants";
import { type WalletsSummary, type WalletResult, PricesAndFees } from "@/types";
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
  const [solanaData, setSolanaData] = useState<{
    currentPrice: number | null;
    canMintNFT: boolean;
  }>({
    currentPrice: null,
    canMintNFT: false,
  });

  const fetchSolanaPrice = useCallback(async () => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch Solana price");
      }
      const priceData = await response.json();
      return priceData.solana.usd;
    } catch (error) {
      console.error("Failed to fetch Solana price:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    const updateSolanaData = async () => {
      const price = await fetchSolanaPrice();
      setSolanaData((prevData) => ({
        ...prevData,
        currentPrice: price,
      }));
    };

    updateSolanaData();
    const interval = setInterval(updateSolanaData, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [fetchSolanaPrice]);

  const data = useMemo<Partial<WalletsSummary>>(() => {
    if (summary?.aggregation) {
      const { aggregation } = summary;
      return {
        firstTransaction: new Date(aggregation.firstTransactionTS),
        solFees: new BigNumber(aggregation.feesTotal)
          .multipliedBy(GAS_DENOMINATOR)
          .decimalPlaces(5)
          .toNumber(),
        txCount: aggregation.transactionsCount,
        txCountUnpaid: aggregation.unpaidTransactionsCount,
        solAvgFee: new BigNumber(aggregation.feesAvg)
          .multipliedBy(GAS_DENOMINATOR)
          .decimalPlaces(6)
          .toNumber(),
      };
    }
    return {};
  }, [summary]);

  const { currentUsdFees, currentUsdAvgFee } = useMemo(() => {
    const { currentPrice } = solanaData;
    if (currentPrice && data.solFees && data.solAvgFee) {
      return {
        currentUsdFees: new BigNumber(data.solFees)
          .multipliedBy(currentPrice)
          .decimalPlaces(2)
          .toNumber(),
        currentUsdAvgFee: new BigNumber(data.solAvgFee)
          .multipliedBy(currentPrice)
          .decimalPlaces(6)
          .toNumber(),
      };
    }
    return { currentUsdFees: null, currentUsdAvgFee: null };
  }, [solanaData.currentPrice, data.solFees, data.solAvgFee]);

  useEffect(() => {
    if (currentUsdFees !== null) {
      setSolanaData((prevData) => ({
        ...prevData,
        canMintNFT: currentUsdFees >= 0.001,
      }));
    }
  }, [currentUsdFees]);

  const handleMintNFT = useCallback(() => {
    // TODO: Implement NFT minting logic
    console.log("Minting NFT...");
  }, []);

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
        {solanaData.canMintNFT ? (
          <div>
            <p className="text-purple-100 mb-4">
              Congratulations! You've spent at least $0.001 in transaction fees.
              You can now mint your NFT.
            </p>
            <button
              onClick={handleMintNFT}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded"
            >
              Mint NFT
            </button>
          </div>
        ) : (
          <p className="text-purple-100">
            You need to spend at least $0.001 in transaction fees to be eligible
            for minting an NFT. Current spend: $
            {currentUsdFees !== null ? currentUsdFees.toFixed(3) : "0.000"}
          </p>
        )}
      </div>
    </div>
  );
};

export { Result };
