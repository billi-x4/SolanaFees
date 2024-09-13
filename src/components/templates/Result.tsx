import React, { useMemo } from "react";
import BigNumber from "bignumber.js";
import { IoInformationCircle } from "react-icons/io5";
import { MdPlaylistAdd, MdSkipPrevious } from "react-icons/md";
import { GAS_DENOMINATOR, TX_CAP } from "@/constants";
import {
  type WalletsSummary,
  type WalletResult,
} from "@/types";
import { Button, DateDisplay, NoWrap, NumberDisplay } from "../atoms";

type ResultProps = {
  addWallet: () => void;
  pricesAndFees: { solanaPrice: number } | null;
  reset: () => void;
  summary: WalletResult;
  wallets: string[];
};

const Result: React.FC<ResultProps> = ({
  addWallet,
  pricesAndFees,
  reset,
  summary,
  wallets,
}) => {
  const data = useMemo(() => {
    let data: Partial<WalletsSummary> = {};
    if (summary && summary.aggregation) {
      const solFees = new BigNumber(summary.aggregation.feesTotal)
        .multipliedBy(GAS_DENOMINATOR)
        .decimalPlaces(5)
        .toNumber();

      data = {
        firstTransaction: new Date(summary.aggregation.firstTransactionTS),
        solFees,
        txCount: summary.aggregation.transactionsCount,
        txCountUnpaid: summary.aggregation.unpaidTransactionsCount,
        solAvgFee: new BigNumber(summary.aggregation.feesAvg)
          .multipliedBy(GAS_DENOMINATOR)
          .decimalPlaces(6)
          .toNumber(),
      };

      if (pricesAndFees && pricesAndFees.solanaPrice) {
        data.usdFees = new BigNumber(solFees)
          .multipliedBy(pricesAndFees.solanaPrice)
          .decimalPlaces(2)
          .toNumber();
        data.usdAvgFee = data.solAvgFee !== undefined
          ? new BigNumber(data.solAvgFee)
              .multipliedBy(pricesAndFees.solanaPrice)
              .decimalPlaces(6)
              .toNumber()
          : undefined;
      }
    }
    return data;
  }, [summary, pricesAndFees]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-purple-200 mb-6">
        Your Solana Transaction Summary
      </h2>

      {(data.txCount as number) >= TX_CAP && (
        <div className="bg-blue-500 bg-opacity-20 border border-blue-400 rounded-lg p-4 flex items-center">
          <IoInformationCircle className="text-blue-300 mr-3 flex-shrink-0" size={24} />
          <p className="text-blue-100 text-sm">
            We're currently capping at {TX_CAP.toLocaleString()} transactions. We're working on increasing this limit!
          </p>
        </div>
      )}

      <div className="bg-white bg-opacity-10 rounded-lg p-6 shadow-lg">
        <h3 className="text-2xl font-bold text-purple-200 mb-4">Overview</h3>
        <p className="text-lg text-purple-100 mb-4">
          {wallets.length > 1 ? (
            <>
              Across your{" "}
              <span className="font-bold text-white">{wallets.length} wallets</span>,{" "}
            </>
          ) : (
            <>Your wallet has </>
          )}
          you've spent{" "}
          <NoWrap className="font-bold text-white">
            ◎ <NumberDisplay val={data.solFees as number} />
          </NoWrap>{" "}
          in fees for{" "}
          <span className="font-bold text-white">{data.txCount?.toLocaleString()} transactions</span>.
        </p>
        {data.usdFees !== undefined && (
          <p className="text-lg text-purple-100">
            Right now, that's equivalent to{" "}
            <NoWrap className="font-bold text-white">
              $ <NumberDisplay val={data.usdFees} />
            </NoWrap>{" "}
            at current prices.
          </p>
        )}
      </div>

      <div className="bg-white bg-opacity-10 rounded-lg p-6 shadow-lg">
        <h3 className="text-2xl font-bold text-purple-200 mb-4">Transaction Details</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-purple-300">Total Transactions:</span>
            <span className="text-white font-semibold">{data.txCount?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-purple-300">Paid Transactions:</span>
            <span className="text-white font-semibold">
              {((data.txCount as number) - (data.txCountUnpaid as number)).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-purple-300">Unpaid Transactions:</span>
            <span className="text-white font-semibold">{data.txCountUnpaid?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-purple-300">Average Fee per Transaction:</span>
            <div className="text-right">
              <NoWrap className="text-white font-semibold">
                ◎ <NumberDisplay val={data.solAvgFee as number} />
              </NoWrap>
              {data.usdAvgFee && (
                <NoWrap className="text-purple-400 text-sm">
                  ($ <NumberDisplay val={data.usdAvgFee} />)
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
          <h3 className="text-2xl font-bold text-purple-200 mb-4">Wallet Information</h3>
          <p className="text-purple-100">
            This summary includes data from <span className="font-semibold text-white">{wallets.length}</span> connected wallets.
          </p>
        </div>
      )}

      <div className="flex justify-center space-x-4 mt-8">
        <Button
          onClick={addWallet}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 flex items-center"
        >
          <MdPlaylistAdd className="mr-2" size={20} />
          Add Another Wallet
        </Button>
        <Button
          onClick={reset}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 flex items-center"
        >
          <MdSkipPrevious className="mr-2" size={20} />
          Start Over
        </Button>
      </div>
    </div>
  );
};

export { Result };
