"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PortfolioSummary } from "@/lib/types";

export function PortfolioValueCard({ portfolio }: { portfolio: PortfolioSummary }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card 
      className={`cursor-pointer overflow-hidden backdrop-blur-sm bg-card/95 hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-500 ease-in-out ${isOpen ? "md:col-span-2 lg:col-span-3 row-span-2 shadow-md ring-1 ring-primary/5" : "lg:col-span-1 shadow-sm"}`} 
      onClick={() => setIsOpen(!isOpen)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={5} className="z-50 bg-popover text-popover-foreground shadow-md rounded-md border p-2">
              <p className="max-w-xs text-xs">Represents the live total market value of all synced equity and mutual fund holdings dynamically fetched from Kite API.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
          ₹{portfolio.totalValue.toLocaleString("en-IN")}
        </div>
        <p className="text-xs text-muted-foreground flex items-center justify-between mt-1">
          <span>Across {portfolio.holdingCount} holdings</span>
          <span className="text-[10px] uppercase font-semibold text-primary/70">{isOpen ? "Hide Holdings" : "View Holdings"}</span>
        </p>

        {isOpen && (
          <div className="mt-5 pt-5 border-t border-border/50 animate-in fade-in slide-in-from-top-4 duration-500">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Individual Holdings</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {portfolio.holdings.map((h, i) => (
                <div key={i} className="flex flex-col bg-slate-50/50 dark:bg-zinc-800/30 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors p-3 rounded-xl border border-border/40">
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-sm font-semibold truncate" title={h.tradingsymbol}>
                      {h.tradingsymbol}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground bg-slate-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded">
                      Qty: {h.quantity}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mt-3">
                    <span className="text-sm font-medium">
                      ₹{(h.quantity * h.last_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${h.pnl >= 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                      {h.pnl >= 0 ? "+" : ""}
                      ₹{h.pnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
