import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

const SYSTEM_PROMPT = `You are CardGuard AI, an expert smart contract security auditor for the Cardano blockchain.

Analyze the given smart contract code and provide a detailed security audit. You must respond in valid JSON with this exact structure:

{
  "riskScore": <number 0-100>,
  "summary": "<one paragraph summary>",
  "vulnerabilities": [
    {
      "id": "VULN-001",
      "severity": "<critical|high|medium|low|info>",
      "title": "<short title>",
      "description": "<detailed description>",
      "line": <line number>,
      "code": "<affected code line>",
      "recommendation": "<how to fix>",
      "cwe": "<CWE number or N/A>"
    }
  ],
  "gasOptimizations": [
    {
      "title": "<optimization title>",
      "description": "<explanation>",
      "line": <line number>
    }
  ],
  "overallAssessment": "<detailed paragraph about contract security>"
}

Rules:
- Check for ALL known Cardano/Plutus/Aiken vulnerability patterns
- Check for logic bugs, reentrancy risks, missing validations
- Check for gas optimization opportunities
- Rate each finding by severity
- Provide specific line numbers and code snippets
- Give actionable recommendations
- If no issues found, return empty vulnerabilities array with high riskScore
- ONLY return valid JSON, no markdown or extra text`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        {
          error: "AI scan requires GROQ_API_KEY. Get free key at console.groq.com",
          fallback: true,
        },
        { status: 503 }
      );
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Audit this ${language} smart contract for Cardano:\n\n${code}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq API error:", err);
      return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid response", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...parsed,
      source: "ai",
      model: "llama-3.3-70b",
      provider: "Groq",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("AI scan error:", err);
    return NextResponse.json({ error: "AI scan failed" }, { status: 500 });
  }
}
