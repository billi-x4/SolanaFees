import { Transition } from "@headlessui/react";
import BigNumber from "bignumber.js";
import clx from "classnames";
import { usePlausible } from "next-plausible";
import { ChangeEvent, SyntheticEvent, useMemo, useState, useEffect } from "react";
import { IoGitCompare, IoInformationCircle } from "react-icons/io5";
import { MdPlaylistAdd, MdSkipPrevious } from "react-icons/md";
import { GAS_DENOMINATOR, TX_CAP } from "@/constants";
import { Comparer } from "@/components/molecules";
import {
  type WalletsSummary,
  type PricesAndFees,
  type WalletResult,
} from "@/types";
import { Button, DateDisplay, NoWrap, NumberDisplay, U } from "../atoms";

type ResultProps = {
  addWallet: () => void;
  className?: string;
  pricesAndFees: PricesAndFees;
  reset: () => void;
  summary: WalletResult;
  wallets: string[];
};

const Result: React.FC<ResultProps> = ({
  addWallet,
  className,
  pricesAndFees,
  reset,
  summary,
  wallets,
}) => {
  const plausible = usePlausible();
  const [currentSolPrice, setCurrentSolPrice] = useState<number | null>(null);

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
    if (pricesAndFees && summary && summary.aggregation) {
      data.usdFees = new BigNumber(summary.aggregation.feesTotal)
        .multipliedBy(GAS_DENOMINATOR)
        .multipliedBy(pricesAndFees.prices.solana)
        .decimalPlaces(2)
        .toNumber();
      data.usdAvgFee = new BigNumber(summary.aggregation.feesAvg)
        .multipliedBy(GAS_DENOMINATOR)
        .multipliedBy(pricesAndFees.prices.solana)
        .decimalPlaces(6)
        .toNumber();
    }

    return data;
  }, [summary, pricesAndFees]);

  useEffect(() => {
    const fetchSolanaPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const priceData = await response.json();
        setCurrentSolPrice(priceData.solana.usd);
      } catch (error) {
        console.error('Failed to fetch Solana price:', error);
      }
    };

    fetchSolanaPrice();
    // Fetch price every 5 minutes
    const interval = setInterval(fetchSolanaPrice, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const currentUsdFees = useMemo(() => {
    if (currentSolPrice && data.solFees) {
      return new BigNumber(data.solFees).multipliedBy(currentSolPrice).decimalPlaces(2).toNumber();
    }
    return null;
  }, [currentSolPrice, data.solFees]);

  const handleResetClick = () => {
    plausible("Reset");
    reset();
  };

  return (
    <div className={clx(className, "flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4")}>
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8 space-y-6">
        {(data.txCount as number) >= TX_CAP ? (
          <p className="flex justify-center items-center mb-4 text-blue-500 text-lg font-semibold">
            <IoInformationCircle className="inline mr-2" size={24} />
            <span>
              We're currently capping at {TX_CAP} transactions. Sorry for the inconvenience!
            </span>
          </p>
        ) : null}
        
        <h2 className="text-2xl md:text-3xl text-center font-bold text-gray-800 mb-4">
          Your Solana Transaction Summary
        </h2>

        <p className="text-xl md:text-2xl text-center leading-relaxed">
          {wallets.length > 1 ? (
            <>
              Across your{" "}
              <span className="font-bold text-solana-purple">{wallets.length} wallets</span>,{" "}
            </>
          ) : (
            <>Your wallet has </>
          )}
          you've spent{" "}
          <NoWrap className="font-bold text-solana-purple">
            ◎ <NumberDisplay val={data.solFees as number} />
          </NoWrap>{" "}
          in fees for{" "}
          <span className="font-bold text-solana-purple">{data.txCount} transactions</span>.
        </p>

        {currentUsdFees !== null ? (
          <p className="text-xl md:text-2xl text-center leading-relaxed mt-4">
            <U className="font-semibold">Right now</U>, that's equivalent to{" "}
            <NoWrap className="font-bold text-solana-purple">
              $ <NumberDisplay val={currentUsdFees} />
            </NoWrap>
            .
          </p>
        ) : null}

        <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
          <p className="mb-2 text-lg">
            You paid for{" "}
            <span className="font-semibold">
              <NumberDisplay
                val={(data.txCount as number) - (data.txCountUnpaid as number)}
              />
            </span>{" "}
            of the {data.txCount} transactions. On average, you paid{" "}
            <NoWrap className="font-semibold">
              ◎ <NumberDisplay val={data.solAvgFee as number} />
            </NoWrap>{" "}
            {data.usdAvgFee ? (
              <NoWrap className="text-gray-600">
                ($ <NumberDisplay val={data.usdAvgFee} />)
              </NoWrap>
            ) : null}{" "}
            per transaction.
          </p>
          <p className="text-lg">
            Your first transaction was on{" "}
            <span className="font-semibold">
              <DateDisplay val={data.firstTransaction as Date} />
            </span>
          </p>
        </div>

        {/* <div className="flex justify-center space-x-4 mt-6">
          <Button onClick={addWallet} className="flex items-center">
            <MdPlaylistAdd className="mr-2" /> Add Another Wallet
          </Button>
          <Button onClick={handleResetClick} className="flex items-center">
            <MdSkipPrevious className="mr-2" /> Start Over
          </Button>
        </div> */}
      </div>
    </div>
  );
};

export { Result };
