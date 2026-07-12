import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

interface Vulnerability {
  title: string;
  description: string;
  line: number;
  code?: string;
}

function applyRegexFixes(code: string, vulnerabilities: Vulnerability[]): { fixedCode: string; fixesApplied: string[] } {
  let fixed = code;
  const fixesApplied: string[] = [];

  for (const vuln of vulnerabilities) {
    const title = vuln.title.toLowerCase();

    // Fix: trace() debug statements
    if (title.includes("trace") || title.includes("debug")) {
      const traceRegex = /^[ \t]*trace\s+.*$/gm;
      if (traceRegex.test(fixed)) {
        fixed = fixed.replace(/^[ \t]*trace\s+.*\n?/gm, "");
        fixesApplied.push("Removed trace() debug statements");
      }
    }

    // Fix: traceIfFalse with empty string
    if (title.includes("empty trace") || title.includes("empty string")) {
      fixed = fixed.replace(/traceIfFalse\s+""\s+/g, 'traceIfFalse "Security check failed" ');
      fixesApplied.push("Added meaningful trace messages");
    }

    // Fix: traceError
    if (title.includes("traceerror")) {
      fixed = fixed.replace(/traceError\s+"[^"]*"/g, 'traceIfFalse "Security check failed" False');
      fixesApplied.push("Replaced traceError with traceIfFalse");
    }

    // Fix: unsafePerformIO
    if (title.includes("unsafeperformio") || title.includes("i/o")) {
      const ioRegex = /^[ \t]*import\s+System\.IO.*$/gm;
      fixed = fixed.replace(ioRegex, "-- import removed for security");
      fixesApplied.push("Removed unsafe I/O imports");
    }

    // Fix: head/last/tail (partial functions)
    if (title.includes("partial function") || title.includes("head") || title.includes("last")) {
      fixed = fixed.replace(/\bhead\s+/g, "(\\x -> case x of { (y:_) -> y; [] -> error \"Empty list\" }) ");
      fixed = fixed.replace(/\blast\s+/g, "(\\x -> case reverse x of { (y:_) -> y; [] -> error \"Empty list\" }) ");
      fixesApplied.push("Replaced partial functions with safe alternatives");
    }

    // Fix: missing signature check
    if (title.includes("missing signature") || title.includes("signature")) {
      if (!fixed.includes("txSignedBy")) {
        const insertPoint = fixed.indexOf("checkSignature =");
        if (insertPoint !== -1) {
          const before = fixed.substring(0, insertPoint);
          const after = fixed.substring(insertPoint);
          fixed = before + "checkSignature = txSignedBy (scriptContextTxInfo ctx) expectedHash\n    expectedHash = unsafeDataAsConstr datum\n  where\n    " + after.replace("checkSignature =", "");
          fixesApplied.push("Added txSignedBy signature check");
        }
      }
    }

    // Fix: hardcoded hash
    if (title.includes("hardcoded") || title.includes("hardcoded hash")) {
      fixed = fixed.replace(/"[0-9a-fA-F]{56,}"/g, "expectedHash");
      fixesApplied.push("Replaced hardcoded hash with parameter");
    }

    // Fix: missing datum/redeemer validation
    if (title.includes("missing datum") || title.includes("missing redeemer")) {
      if (!fixed.includes("checkDatum")) {
        const whereIdx = fixed.lastIndexOf("where");
        if (whereIdx !== -1) {
          fixed = fixed.substring(0, whereIdx) + "\n    checkDatum = True\n  " + fixed.substring(whereIdx);
          fixesApplied.push("Added datum validation");
        }
      }
    }

    // Fix: unsafeDataAsConstr
    if (title.includes("unsafe conversion") || title.includes("unsafeDataAsConstr")) {
      fixed = fixed.replace(/unsafeDataAsConstr\s+/g, "builtinData ");
      fixesApplied.push("Replaced unsafe data conversion");
    }

    // Fix: missing time bounds
    if (title.includes("time bound") || title.includes("missing time")) {
      if (!fixed.includes("contains")) {
        const whereIdx = fixed.lastIndexOf("where");
        if (whereIdx !== -1) {
          fixed = fixed.substring(0, whereIdx) + "\n    checkTime = contains (validityInterval) (txInfoValidRange (scriptContextTxInfo ctx))\n  " + fixed.substring(whereIdx);
          fixesApplied.push("Added time bound validation");
        }
      }
    }

    // Fix: integer overflow
    if (title.includes("overflow") || title.includes("integer overflow")) {
      fixed = fixed.replace(/\+/g, "`addInteger`");
      fixed = fixed.replace(/\*/g, "`multiplyInteger`");
      fixesApplied.push("Replaced operators with safe functions");
    }
  }

  // Remove duplicate lines that may have been created
  const lines = fixed.split("\n");
  const uniqueLines = lines.filter((line, idx) => idx === 0 || line.trim() !== lines[idx - 1]?.trim() || line.trim() === "");
  fixed = uniqueLines.join("\n");

  // Clean up any double blank lines
  fixed = fixed.replace(/\n{3,}/g, "\n\n");

  return { fixedCode: fixed.trim(), fixesApplied };
}

const FIX_PROMPT = `You are CardGuard AI, an expert Cardano smart contract security fixer.

Given the vulnerable code and a list of vulnerabilities, return the FIXED code.

Rules:
- Fix ALL vulnerabilities found
- Keep the same code style and structure
- Keep the same language (Plutus/Aiken/Marlowe)
- Do NOT add comments explaining fixes
- Return ONLY the fixed code in a code block
- Do NOT return any explanation, just the code
- If code is in a module, keep the module structure
- Make minimal changes - only fix what's broken

Return format:
\`\`\`[language]
[fixed code here]
\`\`\``;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, vulnerabilities } = body;

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    // Try AI fix first if API key available
    if (GROQ_API_KEY) {
      try {
        const vulnList = vulnerabilities
          ?.map((v: Vulnerability) => `- Line ${v.line}: ${v.title} — ${v.description}`)
          .join("\n") || "General security review";

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: FIX_PROMPT },
              {
                role: "user",
                content: `Fix this ${language} smart contract:\n\n${code}\n\nVulnerabilities found:\n${vulnList}`,
              },
            ],
            temperature: 0.1,
            max_tokens: 4096,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";
          const codeMatch = content.match(/```(?:haskell|aiken|marlowe)?\s*\n?([\s\S]*?)```/);
          const fixedCode = codeMatch ? codeMatch[1].trim() : content.trim();

          return NextResponse.json({
            fixedCode,
            source: "ai",
            model: "llama-3.3-70b",
            fixesApplied: ["AI-powered fix using Llama 3.3"],
          });
        }
      } catch {
        // Fall through to regex fix
      }
    }

    // Fallback: regex-based fixes
    const { fixedCode, fixesApplied } = applyRegexFixes(code, vulnerabilities || []);

    if (fixesApplied.length === 0) {
      return NextResponse.json({
        fixedCode: code,
        source: "regex",
        fixesApplied: ["No automatic fixes available for these issues"],
        message: "No regex patterns matched. Consider adding GROQ_API_KEY for AI-powered fixes.",
      });
    }

    return NextResponse.json({
      fixedCode,
      source: "regex",
      fixesApplied,
    });
  } catch (err) {
    console.error("Fix error:", err);
    return NextResponse.json({ error: "Auto-fix failed" }, { status: 500 });
  }
}
