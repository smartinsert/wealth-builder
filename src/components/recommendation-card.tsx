"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { MatchedRecommendation } from "@/lib/types";

interface RecommendationCardProps {
  match: MatchedRecommendation;
}

export function RecommendationCard({ match }: RecommendationCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
