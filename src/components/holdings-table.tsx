"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight, Search, ArrowUpDown } from "lucide-react";
import type { Holding } from "@/lib/types";

type SortField = "tradingsymbol" | "value" | "pnl" | "dayChange" | "quantity";
type SortOrder = "asc" | "desc";

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredAndSortedHoldings = useMemo(() => {
    return holdings
      .filter((h) =>
        h.tradingsymbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        let valA, valB;

        switch (sortField) {
          case "tradingsymbol":
            valA = a.tradingsymbol;
            valB = b.tradingsymbol;
            break;
          case "value":
            valA = a.last_price * a.quantity;
            valB = b.last_price * b.quantity;
            break;
          case "pnl":
            valA = a.pnl;
            valB = b.pnl;
            break;
          case "dayChange":
            valA = a.day_change_percentage || 0;
            valB = b.day_change_percentage || 0;
            break;
          case "quantity":
            valA = a.quantity;
            valB = b.quantity;
            break;
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [holdings, searchQuery, sortField, sortOrder]);

  return (
    <Card className="col-span-1 md:col-span-3 mt-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold">Investments</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 bg-background"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("tradingsymbol")} className="-ml-4 h-8 px-4">
                    Symbol <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort("quantity")} className="-mr-4 h-8 px-4">
                    Qty <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort("value")} className="-mr-4 h-8 px-4">
                    Value <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort("pnl")} className="-mr-4 h-8 px-4">
                    P&L <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort("dayChange")} className="-mr-4 h-8 px-4">
                    1D Change <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedHoldings.map((h) => {
                const currentValue = h.last_price * h.quantity;
                const pnlPercent = (h.pnl / (h.average_price * h.quantity)) * 100;

                return (
                  <TableRow key={`${h.exchange}-${h.tradingsymbol}`}>
                    <TableCell className="font-medium">
                      {h.tradingsymbol}
                    </TableCell>
                    <TableCell className="text-right">{h.quantity}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className={`text-right ${h.pnl >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
                      <div>₹{h.pnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                      <div className="text-xs">{pnlPercent.toFixed(2)}%</div>
                    </TableCell>
                    <TableCell className={`text-right ${h.day_change_percentage >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
                      <div className="flex items-center justify-end">
                        {h.day_change_percentage >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {Math.abs(h.day_change_percentage).toFixed(2)}%
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredAndSortedHoldings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No holdings found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
