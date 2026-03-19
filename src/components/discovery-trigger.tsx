"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function DiscoveryTrigger() {
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("google/gemini-1.5-flash-latest");
  const router = useRouter();

  async function handleDiscover() {
    setLoading(true);
    try {
      const res = await fetch("/api/discover", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: model })
      });
      if (res.ok) {
        // Refresh the server component to get new data
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to run discovery:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <select 
        value={model} 
        onChange={(e) => setModel(e.target.value)}
        className="h-9 px-3 py-1 rounded-md border border-input bg-background shadow-sm text-sm"
        disabled={loading}
      >
        <option value="google/gemini-1.5-flash-latest">Gemini 1.5 Flash (Free)</option>
        <option value="google/gemini-1.5-pro-latest">Gemini 1.5 Pro</option>
        <option value="openai/gpt-4o">GPT-4o</option>
        <option value="anthropic/claude-3-haiku-20240307">Claude 3 Haiku</option>
      </select>
      <Button onClick={handleDiscover} disabled={loading}>
        {loading ? "Running Discovery..." : "Run Discovery Engine"}
      </Button>
    </div>
  );
}
