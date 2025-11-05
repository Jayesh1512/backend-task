// Purpose: Hyperliquid service helpers — fetch user fills, funding, clearinghouse state and compute daily PnL summaries
import axios from "axios";

interface DailyPnL {
  date: string;
  realized_pnl_usd: number;
  unrealized_pnl_usd: number;
  fees_usd: number;
  funding_usd: number;
  net_pnl_usd: number;
  equity_usd: number;
}

interface PnLSummary {
  total_realized_usd: number;
  total_unrealized_usd: number;
  total_fees_usd: number;
  total_funding_usd: number;
  net_pnl_usd: number;
}

interface Diagnostics {
  data_source: string;
  last_api_call: string;
  notes: string;
}

interface UserFill {
  closedPnl: string;
  coin: string;
  crossed: boolean;
  dir: string;
  hash: string;
  oid: number;
  px: string;
  side: string;
  startPosition: string;
  sz: string;
  time: number;
  fee: string;
  tid: number;
}

interface UserFunding {
  time: number;
  coin: string;
  usdc: string;
  delta: {
    coin: string;
    fundingRate: string;
    szi: string;
    type: string;
    usdc: string;
  };
  hash: string;
}

interface ClearinghouseState {
  assetPositions: {
    position: {
      coin: string;
      entryPx: string;
      szi: string;
      unrealizedPnl: string;
    };
  }[];
  marginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  crossMarginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  withdrawable: string;
}

/**
**************************
@params wallet: string, start: string, end: string
@return Promise<UserFill[]>

[FUNCTION] : Fetch user fills from the HyperLiquid API within the provided date range.
             Handles pagination to get all fills (API returns max 2000 per request).

**************************
*/
async function getUserFills(
  wallet: string,
  start: string,
  end: string
): Promise<UserFill[]> {
  const allFills: UserFill[] = [];
  let currentStartTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  try {
    while (currentStartTime <= endTime) {
      const response = await axios.post("https://api.hyperliquid.xyz/info", {
        type: "userFillsByTime",
        user: wallet,
        startTime: currentStartTime,
        endTime: endTime,
      });

      const fills: UserFill[] = response.data;

      if (!fills || fills.length === 0) {
        break;
      }

      allFills.push(...fills);

      if (fills.length < 2000) {
        break;
      }

      currentStartTime = fills[fills.length - 1].time + 1;
    }

    return allFills;
  } catch (error) {
    throw new Error(
      `HyperLiquid API error (getUserFills): ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
**************************
@params wallet: string, start: string, end: string
@return Promise<UserFunding[]>

[FUNCTION] : Fetch user funding records from the HyperLiquid API within the provided date range.
             Handles pagination to get all funding records (API returns max 2000 per request).

**************************
*/
async function getUserFunding(
  wallet: string,
  start: string,
  end: string
): Promise<UserFunding[]> {
  const allFunding: UserFunding[] = [];
  let currentStartTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  try {
    while (currentStartTime <= endTime) {
      const response = await axios.post("https://api.hyperliquid.xyz/info", {
        type: "userFunding",
        user: wallet,
        startTime: currentStartTime,
        endTime: endTime,
      });

      const funding: UserFunding[] = response.data;

      if (!funding || funding.length === 0) {
        break;
      }

      allFunding.push(...funding);

      // If we got less than 2000, we have all the data
      if (funding.length < 2000) {
        break;
      }

      // Move start time to the last funding's timestamp + 1ms for next page
      currentStartTime = funding[funding.length - 1].time + 1;
    }

    return allFunding;
  } catch (error) {
    throw new Error(
      `HyperLiquid API error (getUserFunding): ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
**************************
@params wallet: string
@return Promise<ClearinghouseState>

[FUNCTION] : Fetch the clearinghouse state for a given wallet (used to compute unrealized PnL/equity).

**************************
*/
async function getClearinghouseState(
  wallet: string
): Promise<ClearinghouseState> {
  try {
    const response = await axios.post("https://api.hyperliquid.xyz/info", {
      type: "clearinghouseState",
      user: wallet,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      `HyperLiquid API error (getClearinghouseState): ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
**************************
@params wallet: string, start: string, end: string
@return Promise<{ daily: DailyPnL[]; summary: PnLSummary }>

[FUNCTION] : Aggregate fills, funding and clearinghouse data to compute per-day PnL items and a summary for the date range.

NOTES:
- unrealized_pnl_usd: Only populated for today's date (if within range) as it's a current snapshot from clearinghouseState
- equity_usd: Populated only for today's date using accountValue from clearinghouseState
- For historical dates, unrealized_pnl_usd and equity_usd will be 0 (historical unrealized PnL not available via API)
- Handles pagination automatically to get all fills and funding records

**************************
*/
export async function calculateDailyPnL(
  wallet: string,
  start: string,
  end: string
): Promise<{ daily: DailyPnL[]; summary: PnLSummary }> {
  const [fills, funding, clearinghouseState] = await Promise.all([
    getUserFills(wallet, start, end),
    getUserFunding(wallet, start, end),
    getClearinghouseState(wallet),
  ]);

  const dailyPnL: { [date: string]: DailyPnL } = {};
  const startDate = new Date(start);
  const endDate = new Date(end);

  for (
    let dt = new Date(startDate);
    dt <= endDate;
    dt.setUTCDate(dt.getUTCDate() + 1)
  ) {
    const date = dt.toISOString().split("T")[0];
    dailyPnL[date] = {
      date,
      realized_pnl_usd: 0,
      unrealized_pnl_usd: 0,
      fees_usd: 0,
      funding_usd: 0,
      net_pnl_usd: 0,
      equity_usd: 0,
    };
  }

  for (const fill of fills) {
    const date = new Date(fill.time).toISOString().split("T")[0];
    if (dailyPnL[date]) {
      dailyPnL[date].realized_pnl_usd += parseFloat(fill.closedPnl);
      dailyPnL[date].fees_usd += parseFloat(fill.fee);
    }
  }

  for (const fund of funding) {
    const date = new Date(fund.time).toISOString().split("T")[0];
    if (dailyPnL[date]) {
      dailyPnL[date].funding_usd += parseFloat(fund.usdc);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  if (dailyPnL[today] && clearinghouseState?.assetPositions) {
    for (const assetPosition of clearinghouseState.assetPositions) {
      dailyPnL[today].unrealized_pnl_usd += parseFloat(
        assetPosition.position.unrealizedPnl
      );
    }
    if (clearinghouseState.marginSummary?.accountValue) {
      dailyPnL[today].equity_usd = parseFloat(
        clearinghouseState.marginSummary.accountValue
      );
    }
  }
  for (const date in dailyPnL) {
    dailyPnL[date].net_pnl_usd =
      dailyPnL[date].realized_pnl_usd +
      dailyPnL[date].unrealized_pnl_usd -
      dailyPnL[date].fees_usd +
      dailyPnL[date].funding_usd;
  }
  const daily = Object.values(dailyPnL).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const summary = daily.reduce(
    (acc, day) => {
      acc.total_realized_usd += day.realized_pnl_usd;
      acc.total_unrealized_usd += day.unrealized_pnl_usd;
      acc.total_fees_usd += day.fees_usd;
      acc.total_funding_usd += day.funding_usd;
      acc.net_pnl_usd += day.net_pnl_usd;
      return acc;
    },
    {
      total_realized_usd: 0,
      total_unrealized_usd: 0,
      total_fees_usd: 0,
      total_funding_usd: 0,
      net_pnl_usd: 0,
    }
  );

  return { daily, summary };
}
