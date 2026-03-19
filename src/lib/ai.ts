import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export const getModel = (modelId: string) => {
  if (modelId.startsWith("google/")) {
    return google(modelId.replace("google/", ""));
  }
  if (modelId.startsWith("openai/")) {
    return openai(modelId.replace("openai/", ""));
  }
  if (modelId.startsWith("anthropic/")) {
    return anthropic(modelId.replace("anthropic/", ""));
  }
  // Default fallback to Gemini 1.5 Flash (free tier friendly)
  return google("gemini-1.5-flash-latest");
};

const discoverySchema = z.object({
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
1. Identify any specific Indian stock tickers discussed in the text that are traded on the National Stock Exchange (NSE). Provide ONLY the short symbol (e.g. RELIANCE).
2. For each ticker, summarize the reasoning for its mention in 1-2 precise sentences.
3. Determine if the overall sentiment is BUY, SELL, or HOLD.
4. Also extract any broad sector trends mentioned.
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
    return { tickers: [], sectors: [] };
  }
}
