"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AuditResult } from "@/lib/scanner";
import { scanCode } from "@/lib/scanner";
import AttackSimulator, { getAttackSimulation } from "@/components/AttackSimulator";
import DiffViewer from "@/components/DiffViewer";

const SAMPLE_CODE = `module MyValidator where

import Plutus.V2.Ledger.Api
import Plutus.V2.Ledger.Contexts
import PlutusTx
import PlutusTx.Prelude
import System.IO

{-# INLINABLE validator #-}
validator :: Datum -> Redeemer -> ScriptContext -> Bool
validator datum redeemer ctx =
    traceIfFalse "Missing signature" checkSignature
  where
    checkSignature :: Bool
    checkSignature = txSignedBy (scriptContextTxInfo ctx) expectedHash

    expectedHash :: PubKeyHash
    expectedHash = unsafeDataAsConstr datum
`;

const LANGUAGES = [
  { id: "plutus", name: "Plutus" },
  { id: "aiken", name: "Aiken" },
  { id: "marlowe", name: "Marlowe" },
];

interface AIResult {
  source: string;
  model: string;
  riskScore: number;
  summary: string;
  vulnerabilities: {
    id: string;
    severity: string;
    title: string;
    description: string;
    line: number;
    code: string;
    recommendation: string;
    cwe: string;
  }[];
  gasOptimizations: { title: string; description: string; line: number }[];
  overallAssessment: string;
}

export default function AuditPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("plutus");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "results">("editor");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fixedCode, setFixedCode] = useState<string | null>(null);
  const [fixLoading, setFixLoading] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [fixSource, setFixSource] = useState<"ai" | "regex" | null>(null);
  const [fixesApplied, setFixesApplied] = useState<string[]>([]);

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "hs" || ext === "ak" || ext === "ml" || ext === "marlowe" || ext === "txt") {
      if (ext === "hs") setLanguage("plutus");
      else if (ext === "ak") setLanguage("aiken");
      else if (ext === "ml" || ext === "marlowe") setLanguage("marlowe");
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setCode(e.target?.result as string);
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleScan = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setAiResult(null);
    try {
      const data = scanCode(code, language);
      setResult(data);
      setActiveTab("results");
    } catch {
      alert("Scan failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAIScan = async () => {
    if (!code.trim()) return;
    setAiLoading(true);
    setResult(null);
    try {
      const apiKey = localStorage.getItem("GROQ_API_KEY") || prompt("Enter your Groq API key (free at console.groq.com):\n\nOr click Cancel to use basic scan.");
      if (!apiKey) {
        await handleScan();
        return;
      }
      localStorage.setItem("GROQ_API_KEY", apiKey);

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are a Cardano smart contract security auditor. Return valid JSON only." },
            { role: "user", content: `Analyze this ${language} smart contract for security vulnerabilities. Return JSON:\n{"source":"ai","model":"llama-3.3-70b","riskScore":<0-100>,"summary":"<one paragraph>","vulnerabilities":[{"id":"VULN-001","severity":"critical|high|medium|low|info","title":"<title>","description":"<desc>","line":<number>,"code":"<code line>","recommendation":"<fix>","cwe":"CWE-XXX"}],"gasOptimizations":[{"title":"<title>","description":"<desc>","line":<number>}],"overallAssessment":"<2-3 sentences>"}\n\nCode:\n${code}` },
          ],
          temperature: 0.1,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        alert("AI scan failed. Using basic scan.");
        await handleScan();
        return;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        setAiResult(result);
        setActiveTab("results");
      } else {
        await handleScan();
      }
    } catch {
      alert("AI scan failed. Using basic scan.");
      await handleScan();
    } finally {
      setAiLoading(false);
    }
  };

  const handleFix = async () => {
    const vulns = aiResult?.vulnerabilities || result?.vulnerabilities || [];
    if (!code.trim() || vulns.length === 0) return;
    setFixLoading(true);
    setFixedCode(null);
    setShowDiff(false);
    setFixesApplied([]);
    try {
      const apiKey = localStorage.getItem("GROQ_API_KEY");
      if (apiKey) {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: "You are a Cardano smart contract security fixer. Return ONLY the fixed code in a code block. No explanation." },
              { role: "user", content: `Fix this ${language} smart contract:\n\n${code}\n\nVulnerabilities:\n${vulns.map((v: { title: string; description: string; line: number }) => `- Line ${v.line}: ${v.title} — ${v.description}`).join("\n")}` },
            ],
            temperature: 0.1,
            max_tokens: 4096,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";
          const codeMatch = content.match(/```(?:haskell|aiken|marlowe)?\s*\n?([\s\S]*?)```/);
          const fixed = codeMatch ? codeMatch[1].trim() : content.trim();
          setFixedCode(fixed);
          setFixSource("ai");
          setFixesApplied(["AI-powered fix using Llama 3.3"]);
          setShowDiff(true);
          return;
        }
      }

      // Regex fallback
      let fixed = code;
      const fixes: string[] = [];
      for (const vuln of vulns) {
        const title = vuln.title.toLowerCase();
        if (title.includes("trace")) { fixed = fixed.replace(/^[ \t]*trace\s+.*\n?/gm, ""); fixes.push("Removed trace() statements"); }
        if (title.includes("i/o")) { fixed = fixed.replace(/^[ \t]*import\s+System\.IO.*$/gm, "-- import removed"); fixes.push("Removed I/O imports"); }
        if (title.includes("partial")) { fixes.push("Manual fix needed for partial functions"); }
        if (title.includes("signature")) { fixes.push("Manual fix needed for signature check"); }
        if (title.includes("hardcoded")) { fixes.push("Manual fix needed for hardcoded values"); }
      }
      fixed = fixed.replace(/\n{3,}/g, "\n\n").trim();
      setFixedCode(fixed);
      setFixSource("regex");
      setFixesApplied(fixes.length > 0 ? fixes : ["No automatic fixes available"]);
      setShowDiff(true);
    } catch {
      alert("Auto-fix failed.");
    } finally {
      setFixLoading(false);
    }
  };

  const loadSample = () => { setCode(SAMPLE_CODE); setFileName(null); setFixedCode(null); setShowDiff(false); };

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getRiskGradient = (score: number) => {
    if (score >= 80) return "from-emerald-500/20 via-emerald-500/10 to-transparent";
    if (score >= 60) return "from-amber-500/20 via-amber-500/10 to-transparent";
    if (score >= 40) return "from-orange-500/20 via-orange-500/10 to-transparent";
    return "from-red-500/20 via-red-500/10 to-transparent";
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "high": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "medium": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "low": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const displayVulns = aiResult?.vulnerabilities || result?.vulnerabilities || [];
  const displayScore = aiResult?.riskScore ?? result?.riskScore ?? 0;
  const displaySummary = aiResult?.summary || result?.summary || "";
  const isAI = aiResult?.source === "ai";

  return (
    <div className="relative min-h-screen grid-bg">
      <div className="mesh-gradient fixed inset-0 pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-28 pb-16">
        <div className={`mb-8 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <h1 className="text-2xl sm:text-3xl font-bold text-white/90">Contract Audit</h1>
          <p className="mt-1 text-sm text-white/40">Paste code or upload a file for AI-powered security analysis</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Pill active label={language.toUpperCase()} />
            <Pill active={!!aiResult} label={isAI ? "AI Mode" : "Regex"} />
          </div>
        </div>

        <div className={`mb-5 flex gap-2 transition-all duration-500 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <Tab active={activeTab === "editor"} onClick={() => setActiveTab("editor")}>Editor</Tab>
          <Tab active={activeTab === "results"} onClick={() => setActiveTab("results")}>
            Results{(aiResult || result) ? ` (${displayVulns.length})` : ""}
          </Tab>
        </div>

        {activeTab === "editor" && (
          <div className={`grid gap-4 lg:grid-cols-3 transition-all duration-500 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="lg:col-span-2">
              <div className="glass-strong rounded-2xl overflow-hidden card-3d-subtle">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                    </div>
                    <span className="text-xs text-gray-500 hidden sm:inline">{fileName || "contract.hs"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5 rounded-lg bg-white/[0.03] p-0.5">
                      {LANGUAGES.map((l) => (
                        <button key={l.id} onClick={() => setLanguage(l.id)}
                          className={`rounded-md px-2.5 py-1 text-xs transition ${language === l.id ? "bg-white/[0.08] text-white" : "text-gray-500 hover:text-gray-300"}`}>
                          {l.name}
                        </button>
                      ))}
                    </div>
                    <button onClick={loadSample}
                      className="rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-gray-500 hover:text-gray-300 transition">
                      Sample
                    </button>
                  </div>
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`relative transition-all ${dragOver ? "bg-blue-500/10" : ""}`}
                >
                  {dragOver && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500/40 bg-blue-500/5">
                      <span className="text-sm font-semibold text-blue-400">Drop file here (.hs, .ak, .marlowe)</span>
                    </div>
                  )}
                  <textarea value={code} onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste your smart contract code here, or drag & drop a file..."
                    className="code-editor h-80 sm:h-96 w-full resize-none bg-transparent p-4 text-sm text-gray-200/90 placeholder-gray-600/50 leading-relaxed"
                    spellCheck={false} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{code.split("\n").length} lines</span>
                    <input ref={fileInputRef} type="file" accept=".hs,.ak,.ml,.marlowe,.txt"
                      className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                      Upload
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={handleScan} disabled={!code.trim() || loading || aiLoading}
                      className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, #0033ad, #1a5cff)" }}>
                      {loading ? (
                        <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Scanning...</>
                      ) : (
                        <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>Quick Scan</>
                      )}
                    </button>
                    <button onClick={handleAIScan} disabled={!code.trim() || loading || aiLoading}
                      className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white" }}>
                      {aiLoading ? (
                        <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>AI Thinking...</>
                      ) : (
                        <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>AI Deep Scan</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass-strong rounded-2xl p-5 card-3d">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Quick Scan</h3>
                <p className="text-xs text-white/30 mb-3">Pattern-based. Free, fast, no API key.</p>
                <div className="space-y-2">
                  {["Unsafe operations", "Partial functions", "Debug traces", "I/O imports", "Empty hashes", "Data conversions"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-white/40">
                      <div className="flex h-4 w-4 items-center justify-center rounded" style={{ background: "rgba(0,51,173,0.2)" }}>
                        <svg className="h-2.5 w-2.5" style={{ color: "#4d8bff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-strong rounded-2xl p-5 card-3d" style={{ border: "1px solid rgba(124,58,237,0.2)" }}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#a855f7" }}>AI Deep Scan</h3>
                <p className="text-xs text-white/30 mb-3">LLM-powered. Logic bugs, attack vectors, optimizations.</p>
                <div className="space-y-2">
                  {["Logic bug detection", "Reentrancy analysis", "Gas optimization", "Attack vector modeling", "Business logic review", "Best practices audit"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-white/40">
                      <div className="flex h-4 w-4 items-center justify-center rounded" style={{ background: "rgba(124,58,237,0.2)" }}>
                        <svg className="h-2.5 w-2.5" style={{ color: "#a855f7" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
                <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer"
                  className="mt-3 block text-center rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[10px] text-gray-500 hover:text-gray-300 transition">
                  Get free API key →
                </a>
              </div>

              <div className="glass-strong rounded-2xl p-5 card-3d">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Supported Files</h3>
                <div className="flex flex-wrap gap-1.5">
                  {[".hs (Plutus)", ".ak (Aiken)", ".marlowe", ".txt"].map((tag) => (
                    <span key={tag} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] text-white/40">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "results" && (aiResult || result) && (
          <div className={`space-y-4 transition-all duration-500 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {isAI && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                <svg className="h-4 w-4" style={{ color: "#a855f7" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                <span style={{ color: "#a855f7" }}>AI Deep Scan</span>
                <span className="text-gray-500">by {aiResult!.model} via Groq</span>
              </div>
            )}

            <div className={`glass-strong rounded-2xl p-6 sm:p-8 bg-gradient-to-r ${getRiskGradient(displayScore)} card-3d`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Risk Score</div>
                  <div className={`text-5xl sm:text-6xl font-bold ${getRiskColor(displayScore)}`}>{displayScore}</div>
                  <p className="mt-2 max-w-md text-sm text-white/40 leading-relaxed">{displaySummary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ScoreBadge label="Critical" count={displayVulns.filter((v) => v.severity === "critical").length} color="text-red-400" bg="rgba(239,68,68,0.1)" />
                  <ScoreBadge label="High" count={displayVulns.filter((v) => v.severity === "high").length} color="text-orange-400" bg="rgba(249,115,22,0.1)" />
                  <ScoreBadge label="Medium" count={displayVulns.filter((v) => v.severity === "medium").length} color="text-amber-400" bg="rgba(245,158,11,0.1)" />
                  <ScoreBadge label="Low" count={displayVulns.filter((v) => v.severity === "low").length} color="text-blue-400" bg="rgba(59,130,246,0.1)" />
                  <ScoreBadge label="Info" count={displayVulns.filter((v) => v.severity === "info").length} color="text-gray-400" bg="rgba(156,163,175,0.1)" />
                </div>
              </div>
            </div>

            {aiResult?.gasOptimizations && aiResult.gasOptimizations.length > 0 && (
              <div className="glass-strong rounded-2xl p-5 card-3d-subtle" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-400">⚡ Gas Optimizations</h3>
                <div className="space-y-2">
                  {aiResult.gasOptimizations.map((opt, i) => (
                    <div key={i} className="rounded-lg bg-emerald-500/5 p-3">
                      <span className="text-xs font-semibold text-emerald-400">{opt.title}</span>
                      <span className="ml-2 text-[10px] text-gray-600">Line {opt.line}</span>
                      <p className="mt-1 text-xs text-white/40">{opt.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiResult?.overallAssessment && (
              <div className="glass-strong rounded-2xl p-5 card-3d-subtle">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Overall Assessment</h3>
                <p className="text-sm text-white/40 leading-relaxed">{aiResult.overallAssessment}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveTab("editor")} className="glass rounded-xl px-4 py-2 text-sm text-gray-400 hover:text-white transition">← Editor</button>
              <button onClick={() => {
                const exportData = aiResult || result;
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `cardguard-audit.json`; a.click(); URL.revokeObjectURL(url);
              }} className="glass rounded-xl px-4 py-2 text-sm text-gray-400 hover:text-white transition">Export JSON</button>
              <button onClick={handleFix} disabled={fixLoading}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #10b981, #34d399)", color: "white" }}>
                {fixLoading ? (
                  <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Fixing...</>
                ) : (
                  <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.42 15.17l-5.657-5.657a8.023 8.023 0 010-11.314 8.023 8.023 0 0111.314 0 8.023 8.023 0 010 11.314l-5.657 5.657M11.42 15.17L7.05 19.54" /></svg>⚡ Fix All</>
                )}
              </button>
            </div>

            {showDiff && fixedCode && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-white/90">Auto-Fix Applied ✨</h2>
                    <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${
                      fixSource === "ai" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}>
                      {fixSource === "ai" ? "AI Fix" : "Regex Fix"}
                    </span>
                  </div>
                  <button onClick={() => {
                    setCode(fixedCode);
                    setShowDiff(false);
                    setFixedCode(null);
                    setActiveTab("editor");
                    setResult(null);
                    setAiResult(null);
                  }} className="glass rounded-xl px-4 py-2 text-sm text-emerald-400 hover:text-white transition">
                    Apply Fix → Editor
                  </button>
                </div>
                {fixesApplied.length > 0 && (
                  <div className="glass-strong rounded-xl p-4 card-3d-subtle" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Fixes Applied</h4>
                    <div className="space-y-1">
                      {fixesApplied.map((fix, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                          <svg className="h-3 w-3 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {fix}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <DiffViewer oldCode={code} newCode={fixedCode} language={language} />
              </div>
            )}

            <div>
              <h2 className="mb-3 text-lg font-semibold text-white/90">Findings ({displayVulns.length})</h2>
              {displayVulns.length === 0 ? (
                <div className="glass-strong rounded-2xl p-10 text-center card-3d">
                  <div className="text-4xl mb-3">✅</div>
                  <h3 className="text-lg font-semibold text-emerald-400">All Clear</h3>
                  <p className="mt-2 text-sm text-white/40">No vulnerabilities found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayVulns.map((vuln) => (
                    <div key={vuln.id} className="glass-strong rounded-2xl p-5 card-3d-subtle transition hover:bg-white/[0.04]">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase ${getSeverityStyle(vuln.severity)}`}>{vuln.severity}</span>
                        <span className="text-sm font-semibold text-white/80">{vuln.title}</span>
                        <span className="text-xs text-gray-600">Line {vuln.line}</span>
                        {vuln.cwe && vuln.cwe !== "N/A" && <span className="text-xs text-gray-600">{vuln.cwe}</span>}
                      </div>
                      <p className="mb-2 text-sm text-white/40 leading-relaxed">{vuln.description}</p>
                      {vuln.code && (
                        <div className="mb-2 rounded-lg bg-black/30 border border-white/[0.04] p-3">
                          <code className="text-xs text-red-400/80">{vuln.code}</code>
                        </div>
                      )}
                      <div className="rounded-lg p-3" style={{ background: "rgba(0,51,173,0.08)", border: "1px solid rgba(0,51,173,0.15)" }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#4d8bff" }}>Fix</div>
                        <p className="text-xs text-white/40 leading-relaxed">{vuln.recommendation}</p>
                      </div>
                      {(() => {
                        const sim = getAttackSimulation(vuln.title);
                        return sim ? <div className="mt-3"><AttackSimulator simulation={sim} /></div> : null;
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "results" && !aiResult && !result && (
          <div className="glass-strong rounded-2xl p-12 text-center card-3d">
            <div className="text-4xl mb-3">📭</div>
            <h3 className="text-lg font-semibold text-white/80">No Results</h3>
            <p className="mt-2 text-sm text-gray-500">Run a scan to see results.</p>
            <button onClick={() => setActiveTab("editor")}
              className="mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #0033ad, #1a5cff)" }}>Open Editor</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({ active, label }: { active: boolean; label: string }) {
  return (
    <span className="glass rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: active ? "#1a5cff" : "#374151" }} />
      <span className="text-gray-400">{label}</span>
    </span>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${active ? "text-white" : "glass text-gray-400 hover:text-white"}`}
      style={active ? { background: "rgba(0,51,173,0.2)", border: "1px solid rgba(0,51,173,0.3)" } : {}}>
      {children}
    </button>
  );
}

function ScoreBadge({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: bg }}>
      <div className={`text-xl font-bold ${color}`}>{count}</div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">{label}</div>
    </div>
  );
}
