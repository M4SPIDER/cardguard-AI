import { NextRequest, NextResponse } from "next/server";
import { scanCode } from "@/lib/scanner";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    if (code.length > 50000) {
      return NextResponse.json(
        { error: "Code too large. Maximum 50,000 characters." },
        { status: 400 }
      );
    }

    const result = scanCode(code, language || "plutus");

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Scan failed. Please try again." },
      { status: 500 }
    );
  }
}
