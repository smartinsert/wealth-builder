"use client";

import { useState } from "react";
import { PortfolioValueCard } from "@/components/portfolio-value-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RecommendationCard } from "@/components/recommendation-card";
import { PortfolioAnalytics } from "@/components/portfolio-analytics";
import { LTCGTab } from "@/components/ltcg-tab";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { matchDiscoveriesWithHoldings } from "@/lib/portfolio";
import type { PortfolioSummary, DiscoveryResult, PortfolioAuditResult } from "@/lib/types";

interface DashboardClientProps {
  portfolio: PortfolioSummary;
  initialDiscoveries: DiscoveryResult[];
}

export function DashboardClient({ portfolio, initialDiscoveries }: DashboardClientProps) {
  const [discoveries, setDiscoveries] = useState<DiscoveryResult[]>(initialDiscoveries);
  const [loading, setLoading] = useState(false);
  const [filterSource, setFilterSource] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"dashboard" | "ltcg">("dashboard");

  const sources = Array.from(new Set(discoveries.map(d => d.source)));

  const filteredDiscoveries = filterSource === "all" 
    ? discoveries 
    : discoveries.filter(d => d.source === filterSource);

  const auditResult: PortfolioAuditResult | null = 
    discoveries.length > 0 ? matchDiscoveriesWithHoldings(filteredDiscoveries, portfolio) : null;

  async function handleDiscover() {
    setLoading(true);
    try {
      const res = await fetch("/api/discover", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.discoveries) {
          setDiscoveries(data.discoveries);
        }
      } else {
        console.error("Discovery failed", await res.text());
      }
    } catch (error) {
      console.error("Failed to run discovery:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WealthBuilder Dashboard</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            AI-powered discovery engine matching internet signals with your live Kite portfolio.
          </p>
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mt-4">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${
                activeTab === "dashboard" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Discovery
            </button>
            <button
              onClick={() => setActiveTab("ltcg")}
              className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${
                activeTab === "ltcg" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              LTCG Analytics
            </button>
          </div>
        </div>
        <div className="mt-1">
          {activeTab === "dashboard" && (
            <Button onClick={handleDiscover} disabled={loading}>
              {loading ? "Running Discovery..." : "Run Discovery Engine"}
            </Button>
          )}
        </div>
      </header>

      {/* Portfolio Summary */}
      <section className="grid gap-4 md:grid-cols-3">
        <PortfolioValueCard portfolio={portfolio} />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5} className="z-50 bg-popover text-popover-foreground shadow-md rounded-md border p-2">
                  <p className="max-w-xs text-xs">The current net profit or loss of all open holdings in your Kite portfolio, regardless of holding period.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${portfolio.totalPnl >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
              {portfolio.totalPnl >= 0 ? "+" : ""}
              ₹{portfolio.totalPnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Discoveries Tracked</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5} className="z-50 bg-popover text-popover-foreground shadow-md rounded-md border p-2">
                  <p className="max-w-xs text-xs">Total number of unique stock recommendations seamlessly extracted via Vercel AI SDK from the internet financial digests.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{discoveries.length}</div>
            <p className="text-xs text-muted-foreground mt-1">From internet sources</p>
          </CardContent>
        </Card>
        
        <PortfolioAnalytics analytics={portfolio.analytics} />
      </section>

      {/* LTCG Tab View */}
      {activeTab === "ltcg" && <LTCGTab />}

      {/* Discovery Tab View */}
      {activeTab === "dashboard" && (
        <>
        {!auditResult ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/50">
            <h3 className="text-lg font-semibold mb-2">No Discoveries Yet</h3>
            <p className="text-muted-foreground">Click the button around the top right to run the discovery engine and find new opportunities.</p>
          </div>
      ) : (
        <div className="grid gap-8 min-w-0">
          {/* Filters */}
          {sources.length > 1 && (
            <div className="flex items-center gap-2 pb-2 overflow-x-auto">
              <span className="text-sm font-medium text-muted-foreground mr-1 whitespace-nowrap">Filter Sources:</span>
              <Badge 
                variant={filterSource === "all" ? "default" : "outline"} 
                className={`cursor-pointer whitespace-nowrap ${filterSource !== "all" && "hover:bg-muted"}`}
                onClick={() => setFilterSource("all")}
              >
                All Sources
              </Badge>
              {sources.map(src => (
                <Badge 
                  key={src}
                  variant={filterSource === src ? "default" : "outline"} 
                  className={`cursor-pointer capitalize whitespace-nowrap ${filterSource !== src && "hover:bg-muted"}`}
                  onClick={() => setFilterSource(src)}
                >
                  {src}
                </Badge>
              ))}
            </div>
          )}

          {/* New Opportunities */}
          <section className="space-y-4 min-w-0">
            <Carousel opts={{ align: "start" }} className="w-full min-w-0">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold tracking-tight">New Opportunities</h2>
                  <Badge variant="default">{auditResult.newOpportunities.length}</Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0 mr-2">
                  <CarouselPrevious className="static transform-none h-8 w-8 bg-muted text-muted-foreground hover:bg-foreground hover:text-background border-none shrink-0" />
                  <CarouselNext className="static transform-none h-8 w-8 bg-muted text-muted-foreground hover:bg-foreground hover:text-background border-none shrink-0" />
                </div>
              </div>
              {auditResult.newOpportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No new opportunities found.</p>
              ) : (
                <CarouselContent className="-ml-4">
                  {auditResult.newOpportunities.map((match, idx) => (
                    <CarouselItem key={`new-${match.ticker.symbol}-${idx}`} className="pl-4 basis-[calc(100%/3)] sm:basis-[calc(100%/3)]">
                      <div className="p-1 h-full">
                        <RecommendationCard match={match} />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              )}
            </Carousel>
          </section>

          {/* Already Owned */}
          <section className="space-y-4 min-w-0">
            <Carousel opts={{ align: "start" }} className="w-full min-w-0">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold tracking-tight">Already Owned</h2>
                  <Badge variant="secondary">{auditResult.alreadyOwned.length}</Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0 mr-2">
                  <CarouselPrevious className="static transform-none h-8 w-8 bg-muted text-muted-foreground hover:bg-foreground hover:text-background border-none shrink-0" />
                  <CarouselNext className="static transform-none h-8 w-8 bg-muted text-muted-foreground hover:bg-foreground hover:text-background border-none shrink-0" />
                </div>
              </div>
              {auditResult.alreadyOwned.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">None of the discovered stocks are in your portfolio.</p>
              ) : (
                <CarouselContent className="-ml-4">
                  {auditResult.alreadyOwned.map((match, idx) => (
                    <CarouselItem key={`owned-${match.ticker.symbol}-${idx}`} className="pl-4 basis-[calc(100%/3)] sm:basis-[calc(100%/3)]">
                      <div className="p-1 h-full">
                        <RecommendationCard match={match} />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              )}
            </Carousel>
          </section>
        </div>
      )}
        </>
      )}
    </div>
  );
}
