import express from 'express';
import { getTokenInsights } from '../controllers/getTokenInsights';
const router = express.Router();

router.get('/token/:id/insight', getTokenInsights);

export default router;