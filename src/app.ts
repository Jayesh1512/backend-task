import express from 'express';
import router from './routes/router';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import requestLogger from './middleware/requestLogger';
dotenv.config();
const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// body parsing and CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Views (EJS) and static assets
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '..', 'public')));

// Request logging middleware (moved to separate module)
app.use(requestLogger);


// API routes mounted under /api
app.use('/api', router);


// Provide route metadata for the UI
const apiRoutes = [
  {
    method: 'POST',
    path: '/api/token/:id/insight',
    description: 'Token insights (body: { vs_currency, history_days })'
  },
  {
    method: 'GET',
    path: '/api/hyperliquid/:wallet/pnl',
    description: 'HyperLiquid PnL (query: start, end)'
  }
];

// Root - render SSR frontend for API testing
app.get('/', (req: express.Request, res: express.Response) => {
  res.render('index', { apiRoutes });
});

export default app;