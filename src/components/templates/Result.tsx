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
  solanaPrice: number | null;
  totalFeesUSD: number | null;
  isEligible: boolean;
};

const Result: React.FC<ResultProps> = ({
  addWallet,
  reset,
  summary,
  wallets,
  solanaPrice,
  totalFeesUSD,
  isEligible,
}) => {
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
    if (solanaPrice && data.solFees && data.solAvgFee) {
      return {
        currentUsdFees: new BigNumber(data.solFees)
          .multipliedBy(solanaPrice)
          .decimalPlaces(2)
          .toNumber(),
        currentUsdAvgFee: new BigNumber(data.solAvgFee)
          .multipliedBy(solanaPrice)
          .decimalPlaces(6)
          .toNumber(),
      };
    }
    return { currentUsdFees: null, currentUsdAvgFee: null };
  }, [solanaPrice, data.solFees, data.solAvgFee]);

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

      {/* <div className="bg-white bg-opacity-10 rounded-lg p-6 shadow-lg">
        <h3 className="text-2xl font-bold text-purple-200 mb-4">NFT Minting</h3>
        {isEligible ? (
          <div>
            <p className="text-purple-100 mb-4">
              Congratulations! You've spent at least $0.001 in transaction fees.
              You can now mint your NFT.
            </p>
          </div>
        ) : (
          <p className="text-purple-100">
            You need to spend at least $0.001 in transaction fees to be eligible
            for minting an NFT. Current spend: $
            {totalFeesUSD !== null ? totalFeesUSD.toFixed(3) : "0.000"}
          </p>
        )}
      </div> */}
    </div>
  );
};

export { Result };
