// Purpose: Controller for Hyperliquid PNL endpoint — validates request and returns calculated daily PnL and summary
import express from "express";
import validatePNL from "../utils/validatePNL";
import { calculateDailyPnL } from "../services/hyperliquidService";

/**
**************************
@params req: express.Request, res: express.Response, next: express.NextFunction
@return Promise<void>

[FUNCTION] : Validate wallet and date range, call hyperliquid service to calculate daily PnL, and respond with results or appropriate error status.

**************************
*/
export async function getHyperliquidPNL(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const wallet = req.params.wallet;
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;

    console.log(
      `Received request for HyperLiquid PNL. Wallet: ${wallet}, Start: ${start}, End: ${end}`
    );

    if (!start || !end) {
      return res.status(400).json({
        error: "Validation error",
        message: "Start and end dates are required",
      });
    }

    const validation = validatePNL(wallet, start, end);
    if (!validation.valid) {
      console.error(`Validation error: ${validation.error}`);
      return res.status(400).json({
        error: "Validation error",
        message: validation.error,
      });
    }

    const { daily, summary } = await calculateDailyPnL(wallet, start, end);

    res.json({
      wallet,
      start,
      end,
      daily,
      summary,
      diagnostics: {
        data_source: "hyperliquid_api",
        last_api_call: new Date().toISOString(),
        notes: "PnL calculated using daily close prices",
      },
    });
  } catch (error) {
    console.error("Error fetching PnL:", error);

    if (error instanceof Error) {
      if (error.message.includes("HyperLiquid API error")) {
        return res.status(502).json({
          error: "External API error",
          message: "Failed to fetch data from HyperLiquid API",
          details: error.message,
        });
      }

      if (error.message.includes("No response from HyperLiquid API")) {
        return res.status(503).json({
          error: "Service unavailable",
          message: "HyperLiquid API is not responding",
        });
      }
    }
    next(error);
  }
}
