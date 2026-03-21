import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { ticker } = await req.json();

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  }

  const apiKey = process.env.LINKUP_API_KEY;
  if (!apiKey) {
    console.error("[Analyze API] Missing LINKUP_API_KEY");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  const query = `${ticker} NSE stock fundamental analysis, PE ratio, 52-week high low, quarterly profit growth, latest news overview`;

  try {
    const response = await fetch("https://api.linkup.so/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        depth: "standard",
        outputType: "sourcedAnswer",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[Analyze API] LinkUp error:", response.status, text);
      return NextResponse.json({ error: "Upstream Research Error" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      analysis: data.answer || "No structural analysis could be formulated from the current search results.",
      sources: data.results || []
    });

  } catch (error) {
    console.error("[Analyze API] Exception:", error);
    return NextResponse.json({ error: "Failed to generate fundamental analysis" }, { status: 500 });
  }
}
