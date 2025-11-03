import express from 'express';
type CoinGeckoData = { id?: string; symbol?: string; name?: string;[key: string]: any };

export async function getTokenInsights(req: express.Request, res: express.Response) {
    const tokenId = req.params.id;
    const API_KEY = process.env.COINGEKKO_API_KEY;

    console.log(`Fetching insights for token ID: ${tokenId}`);
    const metadataApiUrl = `https://api.coingecko.com/api/v3/coins/${tokenId}`;

    try {
        const response = await fetch(metadataApiUrl, {
            headers: {
                'x-cg-demo-api-key': API_KEY
            }
        });

        if (!response.ok) {
            console.error(`Error fetching metadata from CoinGecko: ${response.statusText}`);
            return res.status(response.status).json({ error: 'Failed to fetch token metadata' });
        }

        const metadata = (await response.json()) as CoinGeckoData;

        const token = {
            id: metadata?.id ?? null,
            symbol: metadata?.symbol ?? null,
            name: metadata?.name ?? null
        };
        return res.status(200).json({ "source": "coingecko", token });

    } catch (error) {
        console.error(`Exception occurred: ${error}`);
        return res.status(500).json({ error: 'Internal server error' });
    }




}