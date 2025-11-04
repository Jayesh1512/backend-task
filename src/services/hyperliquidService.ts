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
      unrealizedPnl: string;
    };
  }[];
}

/**
**************************
@params wallet: string, start: string, end: string
@return Promise<UserFill[]>

[FUNCTION] : Fetch user fills from the HyperLiquid API within the provided date range.

**************************
*/
async function getUserFills(
  wallet: string,
  start: string,
  end: string
): Promise<UserFill[]> {
  try {
    const response = await axios.post("https://api.hyperliquid.xyz/info", {
      type: "userFillsByTime",
      user: wallet,
      startTime: new Date(start).getTime(),
      endTime: new Date(end).getTime(),
    });
    return response.data;
  } catch (error) {
    throw new Error(
      `HyperLiquid API error: ${
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

**************************
*/
async function getUserFunding(
  wallet: string,
  start: string,
  end: string
): Promise<UserFunding[]> {
  try {
    const response = await axios.post("https://api.hyperliquid.xyz/info", {
      type: "userFunding",
      user: wallet,
      startTime: new Date(start).getTime(),
      endTime: new Date(end).getTime(),
    });
    return response.data;
  } catch (error) {
    throw new Error(
      `HyperLiquid API error: ${
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
      `HyperLiquid API error: ${
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
    dt.setDate(dt.getDate() + 1)
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

  for (const i of fills) {
    const date = new Date(i.time).toISOString().split("T")[0];
    if (!dailyPnL[date]) {
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

    dailyPnL[date].realized_pnl_usd += parseFloat(i.closedPnl);
    dailyPnL[date].fees_usd += parseFloat(i.fee);
  }

  for (const fund of funding) {
    const date = new Date(fund.time).toISOString().split("T")[0];
    if (dailyPnL[date]) {
      dailyPnL[date].funding_usd += parseFloat(fund.usdc);
    }
  }

  if (clearinghouseState && clearinghouseState.assetPositions) {
    const lastDay = new Date(end).toISOString().split("T")[0];
    if (dailyPnL[lastDay]) {
      for (const position of clearinghouseState.assetPositions) {
        dailyPnL[lastDay].unrealized_pnl_usd += parseFloat(
          position.position.unrealizedPnl
        );
      }
    }
  }

  const daily = Object.values(dailyPnL);

  const summary = daily.reduce(
    (acc, day) => {
      acc.total_realized_usd += day.realized_pnl_usd;
      acc.total_unrealized_usd += day.unrealized_pnl_usd;
      acc.total_fees_usd += day.fees_usd;
      acc.total_funding_usd += day.funding_usd;
      acc.net_pnl_usd +=
        day.realized_pnl_usd +
        day.unrealized_pnl_usd -
        day.fees_usd +
        day.funding_usd;
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
