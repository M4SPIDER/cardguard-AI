const BLOCKFROST_API = "https://cardano-mainnet.blockfrost.io/api/v0";
const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";

export async function submitAuditToChain(auditId: string, riskScore: number, summaryHash: string) {
  if (!BLOCKFROST_KEY) {
    return {
      success: false,
      message: "Blockfrost API key not configured. Set BLOCKFROST_API_KEY env variable.",
      preview: {
        auditId,
        riskScore,
        summaryHash,
        network: "cardano-testnet (preview mode)",
        txHash: ` preview-tx-${auditId.toLowerCase()}`,
      },
    };
  }

  try {
    const metadata = {
      674: {
        msg: [
          `CardGuard Audit: ${auditId}`,
          `Risk Score: ${riskScore}/100`,
          `Hash: ${summaryHash}`,
          `Timestamp: ${new Date().toISOString()}`,
        ],
      },
    };

    const response = await fetch(`${BLOCKFROST_API}/txs/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/cbor",
        project_id: BLOCKFROST_KEY,
      },
    });

    if (response.ok) {
      const txHash = await response.text();
      return {
        success: true,
        txHash: txHash.replace(/"/g, ""),
        metadata,
      };
    }

    return { success: false, message: "Transaction submission failed" };
  } catch {
    return { success: false, message: "Network error connecting to Blockfrost" };
  }
}

export async function getAuditFromChain(txHash: string) {
  if (!BLOCKFROST_KEY) {
    return null;
  }

  try {
    const response = await fetch(`${BLOCKFROST_API}/txs/${txHash}/metadata`, {
      headers: { project_id: BLOCKFROST_KEY },
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

export function generateAuditHash(code: string, score: number): string {
  let hash = 0;
  const str = code + score.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
