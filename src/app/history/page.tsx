import { getDiscoveries } from "@/lib/kv";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const discoveries = await getDiscoveries();

  // Sort backwards by date
  const sortedDesc = discoveries.sort(
    (a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime()
  );

  return (
    <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
      <header className="pb-6 border-b">
        <h1 className="text-3xl font-bold tracking-tight">Discovery History</h1>
        <p className="text-muted-foreground mt-2">
          Chronological log of all discovered stock signals (up to 7 days).
        </p>
      </header>

      {sortedDesc.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/50">
          <h3 className="text-lg font-semibold mb-2">No History</h3>
          <p className="text-muted-foreground">The discovery engine hasn't found anything recently.</p>
        </div>
      ) : (
        <div className="rounded-md border bg-white dark:bg-zinc-900">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Source</TableHead>
                <TableHead>Article</TableHead>
                <TableHead>Discovered Tickers</TableHead>
                <TableHead>Key Sectors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDesc.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="align-top whitespace-nowrap pt-4">
                    <div className="font-medium">
                      {new Date(item.discoveredAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 capitalize">
                      {item.source}
                    </div>
                  </TableCell>
                  <TableCell className="align-top pt-4">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">
                      {item.title}
                    </a>
                    <p className="text-xs text-muted-foreground mt-2 max-w-md line-clamp-2">
                      {item.summary}
                    </p>
                  </TableCell>
                  <TableCell className="align-top pt-4">
                    <div className="flex flex-wrap gap-1">
                      {item.tickers.length > 0 ? (
                         item.tickers.map((t) => (
                           <Badge key={t.symbol} variant="outline" className="text-xs">
                             {t.symbol}
                           </Badge>
                         ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None found</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top pt-4">
                    <div className="flex flex-wrap gap-1">
                      {item.sectors.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs bg-slate-100">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
