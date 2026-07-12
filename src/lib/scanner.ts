export interface Vulnerability {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  line: number;
  code: string;
  recommendation: string;
  cwe?: string;
}

export interface AuditResult {
  id: string;
  timestamp: string;
  code: string;
  language: string;
  riskScore: number;
  totalIssues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  vulnerabilities: Vulnerability[];
  summary: string;
}

const VULNERABILITY_PATTERNS: {
  pattern: RegExp;
  severity: Vulnerability["severity"];
  title: string;
  description: string;
  recommendation: string;
  cwe: string;
}[] = [
  {
    pattern: /builtin\s+verifySignature/i,
    severity: "high",
    title: "Insecure Signature Verification",
    description:
      "Direct use of verifySignature without additional validation checks can lead to signature malleability attacks.",
    recommendation:
      "Use Plutus.V2 ledger context for signature verification and validate the full transaction context.",
    cwe: "CWE-347",
  },
  {
    pattern: /traceError|error\s*\(/i,
    severity: "low",
    title: "Error Tracing Detected",
    description:
      "traceError and error calls found in validator code. Excessive error handling can expose internal logic.",
    recommendation:
      "Replace traceError with proper error codes and structured error handling.",
    cwe: "CWE-209",
  },
  {
    pattern: /unsafePerformIO|unsafeCoerce|unsafeInterleaveIO/i,
    severity: "critical",
    title: "Unsafe Operations Detected",
    description:
      "Use of unsafe operations bypasses Haskell type system guarantees and can lead to arbitrary code execution.",
    recommendation:
      "Remove all unsafe operations. Use safe alternatives from the Plutus libraries.",
    cwe: "CWE-693",
  },
  {
    pattern: /head\s|tail\s|\!!|undefined/i,
    severity: "high",
    title: "Partial Functions / Bottom Values",
    description:
      "Partial functions like head, tail, and use of !! or undefined can cause runtime crashes on edge cases.",
    recommendation:
      "Use safe alternatives: pattern matching, safeHead, or Maybe/Option types.",
    cwe: "CWE-476",
  },
  {
    pattern: /foldl\s*\(|foldl'\s*\(/i,
    severity: "medium",
    title: "Left Fold Without Strictness",
    description:
      "foldl without strict evaluation can cause space leaks and memory exhaustion with large lists.",
    recommendation:
      "Use foldl' (strict version) or foldr for lazy evaluation where appropriate.",
    cwe: "CWE-400",
  },
  {
    pattern: /trace\s*\(|traceShow\s*\(/i,
    severity: "medium",
    title: "Debug Tracing in Production",
    description:
      "Debug trace statements left in production code leak information and waste execution budget.",
    recommendation:
      "Remove all trace/traceShow calls before deploying to mainnet.",
    cwe: "CWE-532",
  },
  {
    pattern: /import\s+.*System\.IO(?!.*Safe)/i,
    severity: "high",
    title: "Unsafe I/O Import",
    description:
      "Importing System.IO in Plutus validator code enables potential side-channel attacks.",
    recommendation:
      "Remove System.IO imports from on-chain code. I/O operations should be off-chain only.",
    cwe: "CWE-693",
  },
  {
    pattern: /mkValidator.*datum.*redeemer.*ctx\s*=/i,
    severity: "info",
    title: "Validator Pattern Detected",
    description:
      "Standard validator pattern found. Ensure the context is properly validated.",
    recommendation:
      "Verify that all ScriptContext fields used in validation are properly checked.",
    cwe: "N/A",
  },
  {
    pattern: /SlotNo\s+\d+.*&&|slot\s*>=?\s*\d+/i,
    severity: "medium",
    title: "Hardcoded Slot Numbers",
    description:
      "Hardcoded slot numbers make contracts brittle across hard forks and time parameter changes.",
    recommendation:
      "Use relative time checks or parameterize slot references.",
    cwe: "CWE-798",
  },
  {
    pattern: /ada\s*>=?\s*\d{7,}|lovelace\s*>=?\s*\d{10,}/i,
    severity: "medium",
      title: "Large ADA Value Check",
    description:
      "Very large ADA value checks may indicate hardcoded treasury amounts or incorrect calculations.",
    recommendation:
      "Parameterize ADA values and validate against reasonable bounds.",
    cwe: "CWE-20",
  },
  {
    pattern: /txSignedBy\s+ctx/i,
    severity: "info",
    title: "Transaction Signature Check",
    description:
      "txSignedBy is used to verify signer identity. Ensure the correct public key hash is validated.",
    recommendation:
      "Cross-reference with expected signatories and handle the case where the key hash doesn't match.",
    cwe: "N/A",
  },
  {
    pattern: /toBuiltin\s+Data|unsafeDataAsConstr|unsafeDataAsMap/i,
    severity: "medium",
    title: "Unsafe Data Conversion",
    description:
      "Direct Data type conversions can fail at runtime if the data structure doesn't match expected format.",
    recommendation:
      "Use pattern matching on Data constructors or typedFromBuiltin for safe conversions.",
    cwe: "CWE-20",
  },
  {
    pattern: /import\s+.*Unsafe|module.*Unsafe/i,
    severity: "critical",
    title: "Unsafe Module Import",
    description:
      "Importing modules marked as Unsafe bypasses safety guarantees of the Plutus platform.",
    recommendation:
      "Replace with safe module alternatives from Plutus.V2 or PlutusTx.",
    cwe: "CWE-693",
  },
  {
    pattern: /if\s+True\s+then|if\s+False\s+then/i,
    severity: "low",
    title: "Constant Conditional",
    description:
      "Constant boolean conditions suggest dead code or logic errors.",
    recommendation:
      "Remove or refactor constant conditionals to simplify the code.",
    cwe: "CWE-561",
  },
  {
    pattern: /ScriptHash\s*\(\s*\)|PubKeyHash\s*\(\s*\)/i,
    severity: "high",
    title: "Empty Hash Values",
    description:
      "Empty or default hash values can lead to authorization bypass.",
    recommendation:
      "Always validate that hash values are non-empty and match expected format.",
    cwe: "CWE-287",
  },
  {
    pattern: /\btrace\b.*\bsuccess\b|\btrace\b.*\bvalid\b/i,
    severity: "info",
    title: "Success Trace Statement",
    description:
      "Informational trace found. While not harmful, consider removing for production.",
    recommendation:
      "Clean up informational traces before mainnet deployment.",
    cwe: "N/A",
  },
];

function calculateRiskScore(vulns: Vulnerability[]): number {
  let score = 100;
  for (const v of vulns) {
    switch (v.severity) {
      case "critical":
        score -= 30;
        break;
      case "high":
        score -= 15;
        break;
      case "medium":
        score -= 8;
        break;
      case "low":
        score -= 3;
        break;
      case "info":
        score -= 1;
        break;
    }
  }
  return Math.max(0, Math.min(100, score));
}

export function scanCode(code: string, language: string): AuditResult {
  const vulnerabilities: Vulnerability[] = [];
  const lines = code.split("\n");

  for (const rule of VULNERABILITY_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (rule.pattern.test(lines[i])) {
        vulnerabilities.push({
          id: `VULN-${String(vulnerabilities.length + 1).padStart(3, "0")}`,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          line: i + 1,
          code: lines[i].trim(),
          recommendation: rule.recommendation,
          cwe: rule.cwe,
        });
      }
    }
  }

  const critical = vulnerabilities.filter((v) => v.severity === "critical").length;
  const high = vulnerabilities.filter((v) => v.severity === "high").length;
  const medium = vulnerabilities.filter((v) => v.severity === "medium").length;
  const low = vulnerabilities.filter((v) => v.severity === "low").length;
  const info = vulnerabilities.filter((v) => v.severity === "info").length;

  const riskScore = calculateRiskScore(vulnerabilities);

  let summary = "";
  if (riskScore >= 80) {
    summary =
      "✅ Your smart contract appears secure with minimal issues found. Review the informational findings for best practices.";
  } else if (riskScore >= 60) {
    summary =
      "⚠️ Moderate security concerns detected. Review and fix the medium and high severity issues before deployment.";
  } else if (riskScore >= 40) {
    summary =
      "🔶 Significant security issues found. Address all critical and high severity vulnerabilities before proceeding.";
  } else {
    summary =
      "🚨 Critical security vulnerabilities detected! This contract should NOT be deployed until all critical issues are resolved.";
  }

  return {
    id: `AUDIT-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    code,
    language,
    riskScore,
    totalIssues: vulnerabilities.length,
    critical,
    high,
    medium,
    low,
    info,
    vulnerabilities,
    summary,
  };
}
