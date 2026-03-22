"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PortfolioSummary } from "@/lib/types";

export function PortfolioValueCard({ portfolio }: { portfolio: PortfolioSummary }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
          <Tooltip>
            <TooltipTrigger render={<Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />} />
            <TooltipContent side="bottom" sideOffset={5} className="z-50 bg-popover text-popover-foreground shadow-md rounded-md border p-2">
              <p className="max-w-xs text-xs">Represents the live total market value of all synced equity and mutual fund holdings dynamically fetched from Kite API.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
          ₹{portfolio.totalValue.toLocaleString("en-IN")}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          <span>Across {portfolio.holdingCount} holdings</span>
        </p>
      </CardContent>
    </Card>
  );
}
