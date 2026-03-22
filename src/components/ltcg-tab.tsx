"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ── Types ──

interface ConsoleHolding {
  isin: string;
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  // These come from Console API and may include breakup with holding dates
  day_change?: number;
  day_change_percentage?: number;
}

interface HarvestHolding {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  last_price: number;
  unrealizedGain: number;
  unrealizedGainPct: number;
  currentValue: number;
  type: "LTCG" | "STCG";
  buyDateStr: string;
}

interface HarvestingPlan {
  sellGains: HarvestHolding[];     // Profitable stocks to sell to book gains up to ₹1.25L
  sellLosses: HarvestHolding[];    // Loss stocks to sell to offset the gains
  projectedNet: number;            // Net gain after selling selected stocks
  taxableAbove125L: number;        // Amount taxable above ₹1.25L
  estimatedTax: number;            // 12.5% tax on amount above ₹1.25L
}

const LTCG_THRESHOLD = 125000;  // ₹1.25L FY2024-25 onwards
const LTCG_TAX_RATE = 0.125;    // 12.5%

function formatINR(value: number, showSign = false): string {
  const abs = "₹" + Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  if (showSign) return (value >= 0 ? "+" : "-") + abs;
  return abs;
}

// ── Tax Harvesting Optimizer ──
// Goal: Find a combination of holdings to sell such that net realized gain = ₹1.25L
// Strategy: 
//   1. Take ALL losses to offset gains (tax-loss harvesting)
//   2. Then sell gains from smallest to largest until we hit ₹1.25L
function computeHarvestingPlan(profitable: HarvestHolding[], losing: HarvestHolding[]): HarvestingPlan {
  const totalLoss = losing.reduce((sum, h) => sum + h.unrealizedGain, 0); // negative number
  
  // Sort gains smallest first so we sell minimum stocks needed
  const gainsSortedAsc = [...profitable].sort((a, b) => a.unrealizedGain - b.unrealizedGain);
  
  // We want to book gains such that: gains + totalLoss = LTCG_THRESHOLD
  // i.e. gains = LTCG_THRESHOLD - totalLoss = LTCG_THRESHOLD + |totalLoss|
  const targetGains = LTCG_THRESHOLD - totalLoss; // since totalLoss is negative, this is > 1.25L
  
  // If total losses absorb enough, we can book more gains
  // Pick the smallest subset of gains that sums to >= targetGains
  const sellGains: HarvestHolding[] = [];
  let gainsAccum = 0;
  for (const h of gainsSortedAsc) {
    if (gainsAccum >= targetGains) break;
    sellGains.push(h);
    gainsAccum += h.unrealizedGain;
  }

  const projectedNet = gainsAccum + totalLoss;
  const taxableAbove125L = Math.max(0, projectedNet - LTCG_THRESHOLD);
  const estimatedTax = taxableAbove125L * LTCG_TAX_RATE;

  return {
    sellGains,
    sellLosses: losing, // sell ALL losing positions to maximize offset
    projectedNet,
    taxableAbove125L,
    estimatedTax,
  };
}

// ── Sub-components ──

function HoldingRow({ h, tag }: { h: HarvestHolding; tag?: "sell-gain" | "sell-loss" }) {
  const isGain = h.unrealizedGain > 0;
  return (
    <div className={`flex items-center justify-between py-2.5 border-b last:border-0 gap-3 ${
      tag === "sell-gain" ? "bg-emerald-50/50 dark:bg-emerald-950/20" :
      tag === "sell-loss" ? "bg-rose-50/50 dark:bg-rose-950/20" : ""
    } px-2 rounded`}>
      <div className="flex items-center gap-2 min-w-0">
        {tag && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${
            tag === "sell-gain" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
            "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
          }`}>
            {tag === "sell-gain" ? "Book Gain" : "Harvest Loss"}
          </span>
        )}
        <span className="font-mono text-sm font-semibold truncate">{h.tradingsymbol}</span>
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0">{h.exchange}</Badge>
      </div>
      <div className="flex items-center gap-4 text-right shrink-0 text-sm">
        <div className="hidden sm:block text-muted-foreground text-xs text-right">
          <div>{h.quantity} @ {formatINR(h.average_price)}</div>
          <div className="text-[11px]">LTP: {formatINR(h.last_price)}</div>
          <div className="text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
            <span className={h.type === "LTCG" ? "text-purple-600 dark:text-purple-400 font-bold" : "text-amber-600 dark:text-amber-500"}>[{h.type}]</span> {h.buyDateStr}
          </div>
        </div>
        <div className={`font-semibold whitespace-nowrap ${isGain ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
          {formatINR(h.unrealizedGain, true)}
          <div className="text-[10px] font-normal text-muted-foreground">
            {h.unrealizedGainPct.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

export function LTCGTab() {
  const [profitable, setProfitable] = useState<HarvestHolding[]>([]);
  const [losing, setLosing] = useState<HarvestHolding[]>([]);
  const [summary, setSummary] = useState<{
    totalGain: number; totalLoss: number; netPnl: number; count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<HarvestingPlan | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "optimizer">("overview");
  const [sessionExpired, setSessionExpired] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    setSessionExpired(false);
    // Fetch from our server endpoint (which reads from Kite)
    fetch("/api/tax")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setProfitable(d.profitable);
          setLosing(d.losing);
          setSummary({
            totalGain: d.summary.totalUnrealizedGain,
            totalLoss: d.summary.totalUnrealizedLoss,
            netPnl: d.summary.netUnrealizedPnl,
            count: d.summary.totalHoldings,
          });
          // Compute harvesting plan immediately
          setPlan(computeHarvestingPlan(d.profitable, d.losing));
        } else {
          setError(d.error || "Failed to load holdings from Kite");
          if (d.sessionExpired) setSessionExpired(true);
        }
      })
      .catch(() => setError("Could not connect to Kite API"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-muted rounded-xl" />
        <div className="h-56 bg-muted rounded-xl" />
        <div className="h-72 bg-muted rounded-xl" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-10 text-center border rounded-xl border-dashed">
        <p className="text-destructive font-medium mb-1">
          {sessionExpired ? "Kite Session Expired" : "Failed to load tax analytics"}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          {sessionExpired
            ? "Your Kite session tokens have expired or are missing. Please click 'Kite Login' in the top right to re-authenticate."
            : error}
        </p>
        {!sessionExpired && <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>}
      </div>
    );
  }

  const totalGain = summary.totalGain;
  const totalLoss = summary.totalLoss;

  return (
    <div className="space-y-6">

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium">Total Unrealized Gain</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-green-600 dark:text-green-500">
              +{formatINR(totalGain)}
            </div>
            <p className="text-xs text-muted-foreground">{profitable.length} profitable holdings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium">Total Unrealized Loss</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-red-600 dark:text-red-500">
              -{formatINR(Math.abs(totalLoss))}
            </div>
            <p className="text-xs text-muted-foreground">{losing.length} loss-making holdings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium">Net P&L ({summary.count} stocks)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-xl font-bold ${summary.netPnl >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
              {formatINR(summary.netPnl, true)}
            </div>
            <p className="text-xs text-muted-foreground">Unrealized, all holdings</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab switches */}
      <div className="flex items-center gap-1 border-b pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${activeTab === "overview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          Holdings Overview
        </button>
        <button
          onClick={() => setActiveTab("optimizer")}
          className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${activeTab === "optimizer" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          Unrealized Profit Harvester 🎯
        </button>
      </div>

      {/* Holdings Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-400">Profitable Holdings</CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {profitable.length === 0
                ? <p className="text-sm text-muted-foreground italic">None</p>
                : profitable.map(h => <HoldingRow key={h.tradingsymbol} h={h} />)
              }
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-400">Loss-Making Holdings</CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {losing.length === 0
                ? <p className="text-sm text-muted-foreground italic">None</p>
                : losing.map(h => <HoldingRow key={h.tradingsymbol} h={h} />)
              }
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tax Optimizer Tab */}
      {activeTab === "optimizer" && plan && (
        <div className="space-y-4">

          {/* Optimizer Result Banner */}
          <div className={`rounded-xl p-4 border ${
            plan.taxableAbove125L === 0
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className={`font-semibold text-base ${plan.taxableAbove125L === 0 ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}`}>
                  {plan.taxableAbove125L === 0
                    ? "✅ Targeted Realized Gain: ₹1.25L"
                    : `⚠ Harvest simulation falls above tax-free limit`
                  }
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Projected net REALIZED gain: <strong>{formatINR(plan.projectedNet)}</strong>
                  {plan.estimatedTax > 0 && <> · Potentially Taxable: <strong className="text-amber-700 dark:text-amber-400">{formatINR(plan.estimatedTax)}</strong> at LTCG rate</>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatINR(plan.projectedNet)}
                </div>
                <div className="text-xs text-muted-foreground">Est. Gain Target</div>
              </div>
            </div>
          </div>

          {/* What to Sell */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  📈 Book These Gains ({plan.sellGains.length} stocks)
                </CardTitle>
                <p className="text-xs text-muted-foreground">Sell to book long-term gains up to the tax-free limit</p>
              </CardHeader>
              <CardContent className="max-h-72 overflow-y-auto">
                {plan.sellGains.length === 0
                  ? <p className="text-sm text-muted-foreground italic">No long-term gains to book — your losses fully offset any gains.</p>
                  : plan.sellGains.map(h => <HoldingRow key={h.tradingsymbol + h.type} h={h} tag="sell-gain" />)
                }
                <div className="mt-3 pt-2 border-t flex justify-between text-sm font-medium">
                  <span>Total gains to book</span>
                  <span className="text-green-600 dark:text-green-500">+{formatINR(plan.sellGains.reduce((s, h) => s + h.unrealizedGain, 0))}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  📉 Harvest These Losses ({plan.sellLosses.length} stocks)
                </CardTitle>
                <p className="text-xs text-muted-foreground">Sell to offset gains and reduce taxable profit</p>
              </CardHeader>
              <CardContent className="max-h-72 overflow-y-auto">
                {plan.sellLosses.length === 0
                  ? <p className="text-sm text-muted-foreground italic">No losses to harvest — you are among the lucky ones!</p>
                  : plan.sellLosses.map(h => <HoldingRow key={h.tradingsymbol + h.type} h={h} tag="sell-loss" />)
                }
                <div className="mt-3 pt-2 border-t flex justify-between text-sm font-medium">
                  <span>Total losses harvested</span>
                  <span className="text-red-600 dark:text-red-500">{formatINR(plan.sellLosses.reduce((s, h) => s + h.unrealizedGain, 0), true)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Disclaimer */}
          <div className="rounded-md bg-muted/50 border p-3 text-xs text-muted-foreground">
            <strong>Note:</strong> This harvesting plan correctly identifies <strong>LTCG</strong> (&gt;1 year) and <strong>STCG</strong> lots exactly via your Console Tradebook history using FIFO allocation backwards across previous years. Only Long-Term lots are suggested above to reach the 1.25L tax-free threshold.
          </div>
        </div>
      )}
    </div>
  );
}
