import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export const getModel = (modelId: string) => {
  // Gracefully degrade legacy model ID requests from stale frontend clients
  const safeModelId = modelId.replace("-latest", "");

  if (safeModelId.startsWith("google/")) {
    return google(safeModelId.replace("google/", ""));
  }
  if (safeModelId.startsWith("openai/")) {
    return openai(safeModelId.replace("openai/", ""));
  }
  if (safeModelId.startsWith("anthropic/")) {
    return anthropic(safeModelId.replace("anthropic/", ""));
  }
  // Default fallback to Gemini 2.5 Flash (free tier friendly)
  return google("gemini-2.5-flash");
};

const discoverySchema = z.object({
  synopsis: z.string().describe("A precise 2-3 sentence overview of what the article actually discusses, highlighting the macro trends that led to the mentioned stock names or sectors."),
  tickers: z.array(z.object({
    symbol: z.string().describe("The NSE ticker symbol, e.g., RELIANCE, TCS, INFY. Do not include suffixes like .NS"),
    reasoning: z.string().describe("A 1-2 sentence concise summary of why this stock was mentioned in the article."),
    recommendation: z.enum(["BUY", "SELL", "HOLD"]).describe("The sentiment or explicit recommendation derived from the text.")
  })),
  sectors: z.array(z.string()).describe("List of sectors mentioned if broad trends are discussed (e.g., 'Banking', 'IT').")
});

export async function runFundamentalResearchAgent(
  articleTitle: string,
  articleBody: string,
  modelId: string
) {
  const model = getModel(modelId);
  
  const prompt = `You are an expert financial analyst. Analyze the following article and extract key stock tips or insights.
Article Title: ${articleTitle}

Article Text (truncated if too long):
${articleBody.substring(0, 15000)}

Instructions:
1. Write a precise 2-3 sentence synopsis of what exactly the article talks about. What are the key themes, macro trends, or news catalysts?
2. Identify any specific Indian stock tickers discussed in the text that are traded on the National Stock Exchange (NSE). Provide ONLY the short symbol (e.g. RELIANCE).
3. For each ticker, summarize the reasoning for its mention in 1-2 precise sentences.
4. Determine if the overall sentiment is BUY, SELL, or HOLD.
5. Also extract any broad sector trends mentioned.
Keep your output token-efficient and strictly adhere to the required JSON schema.`;

  try {
    const { object } = await generateObject({
      model,
      schema: discoverySchema,
      prompt,
    });
    return object;
  } catch (err) {
    console.error(`[AI SDK] Error extracting from article: ${articleTitle}`, err);
    return { synopsis: "", tickers: [], sectors: [] };
  }
}
