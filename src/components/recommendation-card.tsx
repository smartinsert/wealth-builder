"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { MatchedRecommendation } from "@/lib/types";

interface RecommendationCardProps {
  match: MatchedRecommendation;
}

export function RecommendationCard({ match }: RecommendationCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);

  useEffect(() => {
    if (isOpen && !analysis && !analyzing && !analysisError) {
      setAnalyzing(true);
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: match.ticker.symbol })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.analysis) {
          setAnalysis(data.analysis);
        } else {
          setAnalysisError(true);
        }
      })
      .catch((err) => {
        console.error("Analysis Failed:", err);
        setAnalysisError(true);
      })
      .finally(() => setAnalyzing(false));
    }
  }, [isOpen, analysis, analyzing, analysisError, match.ticker.symbol]);
  
  const isOwned = match.status === "already_owned";
  
  // Badge styling
  const badgeTitle = isOwned ? "Already Owned" : match.ticker.sector;
  const badgeVariant = isOwned 
    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-800 hover:bg-green-200"
    : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100";

  // Recommendation Badge style
  const rec = match.ticker.recommendation;
  const recColors = {
    BUY: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    SELL: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
    HOLD: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  };
  const RecBadge = rec ? (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${recColors[rec]}`}>
      {rec}
    </span>
  ) : null;

  return (
    <Card 
      onClick={() => setIsOpen(!isOpen)}
      className="flex flex-col h-full cursor-pointer hover:border-slate-400 dark:hover:border-zinc-500 transition-all duration-200"
    >
      <CardHeader className="pb-3 flex-1 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg" title={match.ticker.name}>
              {match.ticker.symbol.length > 15 ? match.ticker.symbol.slice(0, 15) + "..." : match.ticker.symbol}
            </CardTitle>
            {RecBadge}
          </div>
          <Badge className={badgeVariant} variant="outline">
            {badgeTitle}
          </Badge>
        </div>
        <CardDescription className="line-clamp-1 break-all mt-1" title={match.ticker.name}>
          {match.ticker.name}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Basic Info */}
        <div className="flex items-end justify-between text-xs text-muted-foreground">
          <div>
            Source: <span className="capitalize font-medium text-foreground">{match.source}</span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        
        {/* Expanded Info */}
        {isOpen && (
          <div className="mt-2 pt-3 border-t space-y-3 text-sm animate-in fade-in slide-in-from-top-2">
            
            {/* Reasoning Block */}
            <div className="bg-muted/50 p-3 rounded-md">
              <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                AI Reasoning
              </span>
              <p className="leading-relaxed">
                {match.ticker.reasoning || "No detailed reasoning provided by the discovery engine for this ticker."}
              </p>
            </div>

            {/* Holdings Block if applicable */}
            {isOwned && match.holding && (
              <div className="space-y-1 bg-green-50/50 dark:bg-green-900/10 p-3 rounded-md">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity Owned:</span>
                  <span className="font-medium">{match.holding.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unrealized P&L:</span>
                  <span className={`font-medium ${match.holding.pnl >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
                    {match.holding.pnl >= 0 ? "+" : ""}
                    ₹{match.holding.pnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            )}

            {/* Fundamental Analysis Block */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-md border border-indigo-100 dark:border-indigo-900/50">
              <span className="font-semibold text-[11px] uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-2 mb-2">
                {analyzing ? (
                  <>
                    <div className="w-3 h-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                    On-Demand Analyst Running...
                  </>
                ) : "Live Fundamental Search"}
              </span>
              
              {analyzing && !analysis && (
                <div className="space-y-2 animate-pulse mt-1">
                  <div className="h-2.5 bg-indigo-200 dark:bg-indigo-800/50 rounded w-full"></div>
                  <div className="h-2.5 bg-indigo-200 dark:bg-indigo-800/50 rounded w-11/12"></div>
                  <div className="h-2.5 bg-indigo-200 dark:bg-indigo-800/50 rounded w-4/5"></div>
                </div>
              )}
              
              {analysisError && !analyzing && (
                <p className="text-destructive text-xs italic">
                  Analyst connection failed. Could not retrieve real-time data from LinkUp.
                </p>
              )}

              {analysis && (
                <div className="text-[13px] leading-relaxed text-indigo-950 dark:text-indigo-200">
                  <div className="whitespace-pre-wrap">{analysis.replace(/\*\*/g, "")}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
