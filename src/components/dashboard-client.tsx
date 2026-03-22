"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PortfolioValueCard } from "@/components/portfolio-value-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, LogIn } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RecommendationCard } from "@/components/recommendation-card";
import { LTCGTab } from "@/components/ltcg-tab";
import { MarketOverview } from "@/components/market-overview";
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
  const router = useRouter();
  const [discoveries, setDiscoveries] = useState<DiscoveryResult[]>(initialDiscoveries);
  const [loading, setLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [filterSource, setFilterSource] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"summary" | "recommendations" | "ltcg">("summary");

  const sources = Array.from(new Set(discoveries.map(d => d.source)));

  const filteredDiscoveries = filterSource === "all" 
    ? discoveries 
    : discoveries.filter(d => d.source === filterSource);

  const auditResult: PortfolioAuditResult | null = 
    discoveries.length > 0 ? matchDiscoveriesWithHoldings(filteredDiscoveries, portfolio) : null;

  async function handleKiteLogin() {
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/kite", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          router.refresh();
        } else {
          console.error("Kite login did not fully succeed:", data.error);
        }
      } else {
        console.error("Kite login request failed", await res.text());
      }
    } catch (error) {
      console.error("Failed to run Kite login:", error);
    } finally {
      setIsLoggingIn(false);
    }
  }

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

  // Calculate portfolio change percent using totalValue and day change
  const portfolioChangePercent = portfolio.holdings.length > 0
    ? (portfolio.holdings.reduce((acc, h) => acc + h.day_change_percentage * h.quantity * h.last_price, 0) / portfolio.totalValue)
    : 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WealthBuilder Dashboard</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            AI-powered discovery engine matching internet signals with your live Kite portfolio.
          </p>
          <div className="flex items-center gap-1 mt-4">
            <button
              onClick={() => setActiveTab("summary")}
              className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${
                activeTab === "summary" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab("recommendations")}
              className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${
                activeTab === "recommendations" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Recommendations
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
        <div className="mt-1 flex flex-col sm:flex-row gap-2">
          {activeTab === "recommendations" && (
            <Button onClick={handleDiscover} disabled={loading || isLoggingIn} variant="outline">
              {loading ? "Running Discovery..." : "Run Discovery Engine"}
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger render={<Button onClick={handleKiteLogin} disabled={loading || isLoggingIn} variant="secondary" />}>
                {isLoggingIn ? "Logging in..." : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Kite Login
                  </>
                )}
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={5} className="z-50 bg-popover text-popover-foreground shadow-md rounded-md border p-2">
              <p className="max-w-xs text-xs">This will launch a secure local Chrome window for you to login manually to Kite and capture tokens.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {activeTab === "summary" && (
        <section className="grid gap-4 md:grid-cols-3">
          <PortfolioValueCard portfolio={portfolio} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
                <Tooltip>
                  <TooltipTrigger render={<Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />} />
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
          
          <MarketOverview portfolioChangePercent={portfolioChangePercent} />
        </section>
      )}

      {activeTab === "recommendations" && (
        <>
          {!auditResult ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/50">
              <h3 className="text-lg font-semibold mb-2">No Discoveries Yet</h3>
              <p className="text-muted-foreground">Click the button around the top right to run the discovery engine and find new opportunities.</p>
            </div>
          ) : (
            <div className="grid gap-8 min-w-0">
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
                        <CarouselItem key={`new-${match.ticker.symbol}-${idx}`} className="pl-4 basis-[calc(100%/1)] sm:basis-[calc(100%/2)] lg:basis-[calc(100%/3)]">
                          <div className="p-1 h-full">
                            <RecommendationCard match={match} />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  )}
                </Carousel>
              </section>

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
                        <CarouselItem key={`owned-${match.ticker.symbol}-${idx}`} className="pl-4 basis-[calc(100%/1)] sm:basis-[calc(100%/2)] lg:basis-[calc(100%/3)]">
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

      {activeTab === "ltcg" && <LTCGTab />}
    </div>
  );
}

