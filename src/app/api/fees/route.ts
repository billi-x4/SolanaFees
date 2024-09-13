import { kv } from "@vercel/kv";
import BigNumber from "bignumber.js";
import { NextResponse } from "next/server";

async function fetchPrices() {
  const token = {
    sol: "So11111111111111111111111111111111111111112",
  };

  const url =
    "https://public-api.birdeye.so/defi/multi_price?list_address=" +
    `${token.sol}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-API-Key": process.env.BIRDEYE_KEY || "",
        "X-Chain": "solana",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const body = await response.json();
    console.log("API response:", JSON.stringify(body, null, 2));

    if (!body.data || typeof body.data !== "object") {
      console.error("Unexpected API response format:", body);
      throw new Error("Unexpected API response format");
    }

    return {
      solana: new BigNumber(body.data[token.sol]?.value || 0)
        .decimalPlaces(5)
        .toNumber(),
    };
  } catch (error) {
    console.error("Error fetching prices:", error);
    throw error;
  }
}

async function GET() {
  let avgGasFees, avgTxGasUsage, prices;
  try {
    [avgGasFees, avgTxGasUsage, prices] = await Promise.all([
      kv.get("avg_gas_fees"),
      kv.get("avg_gas_usage"),
      fetchPrices(),
    ]);

    console.log("Fetched data:", { avgGasFees, avgTxGasUsage, prices });

    if (!avgGasFees || !avgTxGasUsage || !prices) {
      console.error("Missing data:", { avgGasFees, avgTxGasUsage, prices });
      throw new Error("Failed to retrieve required data");
    }

    const data = {
      avgGasFees,
      avgTxGasUsage,
      prices,
      symbols: {
        solana: "Sol",
      },
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET function:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

const maxDuration = 30;
const revalidate = 900; // 15 minutes

export { GET, maxDuration, revalidate };
