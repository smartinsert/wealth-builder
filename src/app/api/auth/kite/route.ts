import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Run the extraction script. This relies on the environment having Chrome/Puppeteer installed
    // and being able to launch headful browsers (typically true for local development).
    const { stdout, stderr } = await execAsync("npm run extract-tokens");
    
    // Check if the script succeeded and produced the expected output tokens
    if (stdout.includes("Successfully captured enctoken") || stdout.includes("Successfully captured both tokens")) {
      return NextResponse.json({ success: true, message: "Kite tokens extracted successfully." });
    } else {
      console.error("[Kite Auth] Output does not indicate full success:", stdout);
      return NextResponse.json({ success: false, error: "Failed to extract all tokens.", logs: stdout }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error("[Kite Auth] Error extracting tokens:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
