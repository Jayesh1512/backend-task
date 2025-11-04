import express from 'express';
import { generateAIResponse } from '../services/aiService';

interface TokenInsightRequest {
    vs_currency?: string;
    history_days?: number;
}

interface CoinGeckoData {
    id?: string;
    symbol?: string;
    name?: string;
    market_data?: {
        current_price?: { [key: string]: number };
        market_cap?: { [key: string]: number };
        total_volume?: { [key: string]: number };
        price_change_percentage_24h?: number;
    };
    [key: string]: any;
}

interface MarketChartData {
    prices?: [number, number][];
    market_caps?: [number, number][];
    total_volumes?: [number, number][];
}

export async function getTokenInsights(req: express.Request, res: express.Response) {
    const tokenId = req.params.id;
    const requestBody: TokenInsightRequest = req.body || {};
    const vs_currency = requestBody.vs_currency || 'usd';
    const history_days = requestBody.history_days || 30;
    
    const COINGECKO_API_KEY = process.env.COINGECKO_DEMO_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    console.log(`Fetching insights for token ID: ${tokenId}`);
    console.log(`Request parameters: vs_currency=${vs_currency}, history_days=${history_days}`);
    
    const metadataApiUrl = `https://api.coingecko.com/api/v3/coins/${tokenId}`;
    const marketChartApiUrl = `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=${vs_currency}&days=${history_days}`;
    
    try {
        const metadataResponse = await fetch(metadataApiUrl, {
            headers: COINGECKO_API_KEY ? { 'x-cg-demo-api-key': COINGECKO_API_KEY } : {}
        });

        if (!metadataResponse.ok) {
            console.error(`Error fetching metadata from CoinGecko: ${metadataResponse.statusText}`);
            return res.status(metadataResponse.status).json({ 
                error: 'Failed to fetch token metadata',
                details: metadataResponse.statusText 
            });
        }

        const metadata = (await metadataResponse.json()) as CoinGeckoData;

        const marketData = {
            current_price_usd: metadata.market_data?.current_price?.[vs_currency] || 0,
            market_cap_usd: metadata.market_data?.market_cap?.[vs_currency] || 0,
            total_volume_usd: metadata.market_data?.total_volume?.[vs_currency] || 0,
            price_change_percentage_24h: metadata.market_data?.price_change_percentage_24h || 0
        };

        let priceHistoryText = '';
        try {
            const marketChartResponse = await fetch(marketChartApiUrl, {
                headers: COINGECKO_API_KEY ? { 'x-cg-demo-api-key': COINGECKO_API_KEY } : {}
            });

            if (marketChartResponse.ok) {
                const chartData = (await marketChartResponse.json()) as MarketChartData;
                const prices = chartData.prices || [];
                
                if (prices.length > 0) {
                    const firstPrice = prices[0][1];
                    const lastPrice = prices[prices.length - 1][1];
                    const priceChange = ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2);
                    
                    priceHistoryText = `Over the past ${history_days} days, the price changed by ${priceChange}% (from $${firstPrice.toFixed(2)} to $${lastPrice.toFixed(2)}).`;
                    console.log(`Price history: ${priceHistoryText}`);
                }
            }
        } catch (chartError) {
            console.warn('Failed to fetch market chart data:', chartError);
        }
        const insight = await generateAIResponse({
            tokenInfo: {
                name: metadata.name || tokenId,
                symbol: metadata.symbol || ''
            },
            marketData,
            priceHistoryText,
            apiKey: GEMINI_API_KEY
        });
        const response = {
            source: 'coingecko',
            token: {
                id: metadata.id || tokenId,
                symbol: metadata.symbol || '',
                name: metadata.name || '',
                market_data: marketData
            },
            insight: {
                reasoning: insight.reasoning,
                sentiment: insight.sentiment
            },
            model: {
                provider: 'google',
                model: 'gemini-1.5-flash'
            }
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error(`Exception occurred: ${error}`);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}