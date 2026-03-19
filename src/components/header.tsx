import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="border-b bg-white dark:bg-black sticky top-0 z-10 w-full">
      <div className="flex h-16 items-center justify-between px-4 max-w-7xl mx-auto w-full gap-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold flex items-center gap-2">
            <span>WealthBuilder</span>
            <Badge variant="secondary" className="text-xs">Beta</Badge>
          </Link>
          <nav className="flex items-center space-x-4 lg:space-x-6">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
            <Link
              href="/history"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              History
            </Link>
          </nav>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
