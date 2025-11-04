import express from "express";
import validatePNL from "../utils/validatePNL";

export async function getHyperliquidPNL(
  req: express.Request,
  res: express.Response
) {
  const wallet = req.params.wallet;
  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;
  console.log(
    `Received request for HyperLiquid PNL. Wallet: ${wallet}, Start: ${start}, End: ${end}`
  );
  const validation = validatePNL(wallet, start!, end!);
  if (!validation.valid) {
    console.error(`Validation error: ${validation.error}`);
    return res.status(400).json({ error: validation.error });
  }
}
