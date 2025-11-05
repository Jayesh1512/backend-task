import { GoogleGenerativeAI } from "@google/generative-ai";

interface MarketData {
  current_price_usd: number;
  market_cap_usd: number;
  total_volume_usd: number;
  price_change_percentage_24h: number;
}

interface TokenInfo {
  name: string;
  symbol: string;
}

interface AIInsight {
  reasoning: string;
  sentiment: string;
}

interface GenerateAIResponseParams {
  tokenInfo: TokenInfo;
  marketData: MarketData;
  priceHistoryText?: string;
  apiKey?: string;
}

/**
**************************
@params params: GenerateAIResponseParams
@return Promise<AIInsight>

[FUNCTION] : Build a prompt from token and market data, call the Gemini model and parse the JSON insight response (reasoning + sentiment).

**************************
*/
export async function generateAIResponse(
  params: GenerateAIResponseParams
): Promise<AIInsight> {
  const { tokenInfo, marketData, priceHistoryText = "", apiKey } = params;
  const MODEL_NAME: string = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const defaultInsight: AIInsight = {
    reasoning: "AI analysis unavailable",
    sentiment: "Neutral",
  };

  if (!apiKey) {
    console.warn("Gemini API key not provided, using default insight");
    return defaultInsight;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const findNumeric = (obj: any, prefix: string): number => {
      if (!obj || typeof obj !== "object") return 0;
      const direct = obj[`${prefix}_usd`];
      if (typeof direct === "number") return direct;
      for (const k of Object.keys(obj)) {
        if (k.startsWith(`${prefix}_`) && typeof obj[k] === "number")
          return obj[k];
      }
      return 0;
    };

    const currentPrice = findNumeric(marketData, "current_price");
    const marketCap = findNumeric(marketData, "market_cap");
    const totalVolume = findNumeric(marketData, "total_volume");
    const priceChange =
      typeof marketData.price_change_percentage_24h === "number"
        ? marketData.price_change_percentage_24h
        : 0;

    const fmt = (n: any) => {
      if (n === null || n === undefined) return "0";
      if (typeof n === "number" || typeof n === "bigint")
        return n.toLocaleString();
      const parsed = Number(n);
      return isNaN(parsed) ? String(n) : parsed.toLocaleString();
    };

    const prompt = `You are a cryptocurrency market analyst. Analyze the following token data and provide insights.
        Token: ${tokenInfo.name} (${tokenInfo.symbol.toUpperCase()})
        Current Price: $${fmt(currentPrice)}
        Market Cap: $${fmt(marketCap)}
        24h Volume: $${fmt(totalVolume)}
        24h Price Change: ${Number(priceChange).toFixed(2)}%
        ${priceHistoryText}
        Based on this data, provide a brief analysis (2-3 sentences) and determine the market sentiment.
        Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, no backticks):
        {
            "reasoning": "Your brief analysis here (2-3 sentences)",
            "sentiment": "Bullish/Bearish/Neutral"
        }`;

    console.log("Calling Gemini API...");
    const result = await model.generateContent(prompt);
    const response = result.response;
    const aiContent = response.text();

    if (!aiContent) {
      console.warn("No content in Gemini response");
      return defaultInsight;
    }

    let cleanedContent = aiContent.trim();
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
    } else if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.replace(/```\n?/g, "");
    }

    cleanedContent = cleanedContent.trim();

    try {
      const parsedInsight = JSON.parse(cleanedContent) as AIInsight;

      if (!parsedInsight.reasoning || !parsedInsight.sentiment) {
        console.warn("AI response missing required fields");
        return defaultInsight;
      }
      const validSentiments = ["Bullish", "Bearish", "Neutral"];
      if (!validSentiments.includes(parsedInsight.sentiment)) {
        console.warn(`Invalid sentiment value: ${parsedInsight.sentiment}`);
        parsedInsight.sentiment = "Neutral";
      }

      console.log("Gemini insight generated successfully");
      return parsedInsight;
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      console.error("Raw response:", cleanedContent);
      return defaultInsight;
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }

    return defaultInsight;
  }
}

export default generateAIResponse;
