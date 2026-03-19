import { fetchHoldings } from "@/lib/portfolio";
import { getDiscoveries } from "@/lib/kv";
import { DashboardClient } from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const portfolio = await fetchHoldings();
  const discoveries = await getDiscoveries();

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto w-full">
      <DashboardClient portfolio={portfolio} initialDiscoveries={discoveries} />
    </main>
  );
}
