"use client";

import { useState } from "react";
import { PortfolioValueCard } from "@/components/portfolio-value-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecommendationCard } from "@/components/recommendation-card";
import { PortfolioAnalytics } from "@/components/portfolio-analytics";
import { matchDiscoveriesWithHoldings } from "@/lib/portfolio";
import type { PortfolioSummary, DiscoveryResult, PortfolioAuditResult } from "@/lib/types";

interface DashboardClientProps {
  portfolio: PortfolioSummary;
  initialDiscoveries: DiscoveryResult[];
}

export function DashboardClient({ portfolio, initialDiscoveries }: DashboardClientProps) {
  const [discoveries, setDiscoveries] = useState<DiscoveryResult[]>(initialDiscoveries);
  const [loading, setLoading] = useState(false);

  const auditResult: PortfolioAuditResult | null = 
    discoveries.length > 0 ? matchDiscoveriesWithHoldings(discoveries, portfolio) : null;

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
        </div>
        <div className="mt-1">
          <Button onClick={handleDiscover} disabled={loading}>
            {loading ? "Running Discovery..." : "Run Discovery Engine"}
          </Button>
        </div>
      </header>

      {/* Portfolio Summary */}
      <section className="grid gap-4 md:grid-cols-3">
        <PortfolioValueCard portfolio={portfolio} />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
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
            <CardTitle className="text-sm font-medium">Discoveries Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{discoveries.length}</div>
            <p className="text-xs text-muted-foreground mt-1">From internet sources</p>
          </CardContent>
        </Card>
        
        <PortfolioAnalytics analytics={portfolio.analytics} />
      </section>

      {!auditResult ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/50">
          <h3 className="text-lg font-semibold mb-2">No Discoveries Yet</h3>
          <p className="text-muted-foreground">Click the button around the top right to run the discovery engine and find new opportunities.</p>
        </div>
      ) : (
        <div className="grid gap-8">
          {/* New Opportunities */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight">New Opportunities</h2>
              <Badge variant="default">{auditResult.newOpportunities.length}</Badge>
            </div>
            {auditResult.newOpportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No new opportunities found.</p>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {auditResult.newOpportunities.map((match, idx) => (
                  <RecommendationCard key={`new-${match.ticker.symbol}-${idx}`} match={match} />
                ))}
              </div>
            )}
          </section>

          {/* Already Owned */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight">Already Owned</h2>
              <Badge variant="secondary">{auditResult.alreadyOwned.length}</Badge>
            </div>
            {auditResult.alreadyOwned.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">None of the discovered stocks are in your portfolio.</p>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {auditResult.alreadyOwned.map((match, idx) => (
                  <RecommendationCard key={`owned-${match.ticker.symbol}-${idx}`} match={match} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
