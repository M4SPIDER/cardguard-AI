import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auditId, riskScore, hash, language, totalIssues } = body;

    const metadata = {
      674: {
        msg: [
          `CardGuard Audit: ${auditId}`,
          `Risk Score: ${riskScore}/100`,
          `Hash: ${hash}`,
          `Language: ${language}`,
          `Issues: ${totalIssues}`,
          `Timestamp: ${new Date().toISOString()}`,
        ],
      },
    };

    return NextResponse.json({
      success: true,
      auditId,
      hash,
      metadata,
      message: "Audit ready for on-chain submission via wallet",
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
