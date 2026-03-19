"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioAnalytics as AnalyticsDetails } from "@/lib/types";

export function PortfolioAnalytics({ analytics }: { analytics?: AnalyticsDetails }) {
  if (!analytics) return null;

  const ltcgLimit = 125000;
  const ltcgRemaining = Math.max(0, ltcgLimit - analytics.ltcgUnrealizedProfit);
  const ltcgPercent = Math.min(100, (analytics.ltcgUnrealizedProfit / ltcgLimit) * 100);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Est. Realized Tax PnL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${analytics.realizedTaxPnl >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
            {analytics.realizedTaxPnl >= 0 ? "+" : ""}
            ₹{analytics.realizedTaxPnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Net profit from current FY trades</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">LTCG Limit Available</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-baseline">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ₹{ltcgRemaining.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500 ease-in-out" 
              style={{ width: `${ltcgPercent}%` }}
              title={`₹${analytics.ltcgUnrealizedProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })} utilized`}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
            Of ₹1.25L yearly threshold. Unrealized profit older than 1 year is ₹{analytics.ltcgUnrealizedProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
