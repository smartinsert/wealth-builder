"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Activity } from "lucide-react";
import type { Holding } from "@/lib/types";

interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export function MarketOverview({ portfolioChangePercent, holdings }: { portfolioChangePercent: number, holdings: Holding[] }) {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<string>("1D");
  const [historicalData, setHistoricalData] = useState<{niftyReturns: number, portfolioReturns: number} | null>(null);

  // Fetch 1D daily indices
  useEffect(() => {
    async function fetchIndices() {
      try {
        const res = await fetch("/api/indices");
        const json = await res.json();
        if (json.success) {
          setIndices(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch indices", err);
      } finally {
        if (timeframe === "1D") setLoading(false);
      }
    }
    fetchIndices();
  }, []);

  // Fetch Historical data if timeframe > 1D
  useEffect(() => {
    if (timeframe === "1D") {
      setHistoricalData(null);
      setLoading(false);
      return;
    }

    async function fetchHistorical() {
      setLoading(true);
      try {
        const res = await fetch("/api/portfolio/historical", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeframe, holdings })
        });
        const json = await res.json();
        if (json.success) {
          setHistoricalData({
            niftyReturns: json.niftyReturns,
            portfolioReturns: json.portfolioReturns
          });
        }
      } catch (err) {
        console.error("Failed to fetch historical data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistorical();
  }, [timeframe, holdings]);

  const nifty = indices.find(i => i.symbol === "^NSEI");
  const bankNifty = indices.find(i => i.symbol === "^NSEBANK");

  const currentNiftyReturn = historicalData ? historicalData.niftyReturns : (nifty?.changePercent || 0);
  const currentPortfolioReturn = historicalData ? historicalData.portfolioReturns : portfolioChangePercent;
  
  const isPortfolioBeatingNifty = currentPortfolioReturn > currentNiftyReturn;

  return (
    <Card className="col-span-1 md:col-span-3">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" /> Market Overview
        </CardTitle>
        <div className="flex gap-1 bg-muted p-1 rounded-md text-xs font-medium">
          {["1D", "1W", "1M", "6M", "1Y"].map((tf) => (
             <button 
               key={tf}
               onClick={() => setTimeframe(tf)}
               className={`px-2 py-1 rounded-sm ${timeframe === tf ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-background/50"}`}
             >
               {tf}
             </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex items-center space-x-4 animate-pulse">
            <div className="h-10 w-10 bg-muted rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-[200px]" />
              <div className="h-4 bg-muted rounded w-[150px]" />
            </div>
          </div>
        ) : (
          <>
            {/* Nifty 50 */}
            {nifty && (
              <div className="flex flex-col border rounded-md p-3">
                <span className="text-xs text-muted-foreground font-medium mb-1">NIFTY 50 {timeframe !== "1D" && `(${timeframe})`}</span>
                <div className="flex items-baseline gap-2">
                  {timeframe === "1D" ? (
                    <span className="text-xl font-bold">
                      {nifty.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-xl font-bold">
                      Return
                    </span>
                  )}
                  <span className={`text-sm font-medium flex items-center ${
                    currentNiftyReturn >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                  }`}>
                    {currentNiftyReturn >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                    {Math.abs(currentNiftyReturn).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}

            {/* Bank Nifty */}
            {bankNifty && (
              <div className="flex flex-col border rounded-md p-3">
                <span className="text-xs text-muted-foreground font-medium mb-1">NIFTY BANK (1D)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold">
                    {bankNifty.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-sm font-medium flex items-center ${
                    bankNifty.change >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                  }`}>
                    {bankNifty.change >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                    {Math.abs(bankNifty.changePercent).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}

            {/* Portfolio vs Nifty */}
            {nifty && (
              <div className="flex flex-col border rounded-md p-3">
                <span className="text-xs text-muted-foreground font-medium mb-1">Portfolio vs NIFTY 50 {timeframe !== "1D" && `(${timeframe})`}</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-bold ${
                    isPortfolioBeatingNifty ? "text-blue-600 dark:text-blue-500" : "text-amber-600 dark:text-amber-500"
                  }`}>
                    {isPortfolioBeatingNifty ? "Beating" : "Trailing"}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    by {Math.abs(currentPortfolioReturn - currentNiftyReturn).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
