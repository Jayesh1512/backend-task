// Purpose: API route registrations for token insight and hyperliquid PnL endpoints
import express from 'express';
import { getTokenInsights } from '../controllers/getTokenInsights';
import { getHyperliquidPNL } from '../controllers/getHyperLiquidPNL';
const router = express.Router();

router.post('/token/:id/insight', getTokenInsights);
router.get('/hyperliquid/:wallet/pnl', getHyperliquidPNL);
export default router;