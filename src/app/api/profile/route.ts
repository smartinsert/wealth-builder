import { NextResponse } from "next/server";

export async function GET() {
  const encToken = process.env.KITE_ENCTOKEN;

  if (!encToken) {
    return NextResponse.json({ success: false, error: "Missing KITE_ENCTOKEN" }, { status: 401 });
  }

  try {
    const res = await fetch("https://kite.zerodha.com/oms/user/profile", {
      headers: {
        authorization: `enctoken ${encToken}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch profile from Kite" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Profile API Error]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
