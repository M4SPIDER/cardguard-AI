"use client";

import { useState, useEffect, useRef } from "react";

export interface AttackSimulation {
  vulnerability: string;
  severity: string;
  terminalLines: string[];
  impact: string;
  prevention: string;
}

const ATTACK_SCRIPTS: Record<string, AttackSimulation> = {
  "Insecure Signature Verification": {
    vulnerability: "Missing Owner Check — Signature Bypass",
    severity: "critical",
    terminalLines: [
      "$ cardano-cli query utxo --address attacker_addr",
      "> Found 3 UTXOs on target contract",
      "",
      "$ cat exploit.py",
      '> payload = {"redeemer": fake_sig, "datum": "0x00"}',
      "",
      "$ python3 exploit.py --target contract_v1",
      "> Building malicious transaction...",
      "> Forging signature payload...",
      "> Submitting to Cardano testnet...",
      "",
      "⚠  SIGNATURE CHECK BYPASSED",
      "> txSignedBy → False (expected True)",
      "> Validator returns TRUE anyway",
      "",
      "💰  TRANSFERRING FUNDS...",
      "> Contract balance: 50,000.00 ADA",
      "> Withdrawing: 50,000.00 ADA",
      "> Transaction submitted: 0xa3f8...c21d",
      "",
      "🔴  CONTRACT DRAINED — 0.00 ADA remaining",
    ],
    impact: "All 50,000 ADA stolen in single transaction",
    prevention: "Add txSignedBy check against expected pubkey hash before returning True",
  },
  "Unsafe Operations Detected": {
    vulnerability: "unsafeCoerce Memory Corruption",
    severity: "critical",
    terminalLines: [
      "$ cat exploit.hs",
      '> maliciousDatum = unsafeCoerce "AAAA...9999"',
      "",
      "$ aiken build && submit-attack",
      "> Compiling Plutus Core...",
      "> Deploying to testnet...",
      "",
      "⚠  UNSAFE OPERATION TRIGGERED",
      "> unsafeCoerce: type mismatch detected",
      "> Datum type: Data → expected: PubKeyHash",
      "> Memory layout corrupted",
      "",
      "💥  VALIDATOR CRASH",
      "> ScriptContext evaluation failed",
      "> Exit code: 1 (segfault)",
      "",
      "🔴  CONTRACT PERMANENTLY BRICKED",
      "> No recovery possible without upgrade",
    ],
    impact: "Contract becomes permanently unusable",
    prevention: "Replace unsafeCoerce with typed deserialization",
  },
  "Partial Functions / Bottom Values": {
    vulnerability: "head [] — Empty List Crash",
    severity: "high",
    terminalLines: [
      "$ cat exploit.json",
      '> {"datum": [], "redeemer": "withdraw"}',
      "",
      "$ submit-attack.sh",
      "> Sending empty list as Datum...",
      "> Transaction confirmed in slot 12345",
      "",
      "⚠  PARTIAL FUNCTION CALLED",
      "> head [] → Exception: Empty list",
      "> Prelude.head: empty list",
      "",
      "💥  VALIDATOR EXECUTION HALTED",
      "> Script budget consumed: 100%",
      "> Output: VALIDATION_FAILED",
      "",
      "🔴  CONTRACT LOCKED INDEFINITELY",
      "> 25,000 ADA cannot be recovered",
    ],
    impact: "25,000 ADA permanently locked",
    prevention: "Use headMay or pattern match: case list of [] -> False; x:xs -> ...",
  },
  "Debug Tracing in Production": {
    vulnerability: "Debug Trace — Logic Leakage",
    severity: "medium",
    terminalLines: [
      "$ cardano-cli submit-tx --file normal.tx",
      "> User makes legitimate withdrawal",
      "",
      "⚠  TRACE OUTPUT LEAKED",
      '> trace: "Expected hash: a1b2c3d4e5f6"',
      '> trace: "Validator logic: if slot > 50000"',
      '> trace: "Secret key: 0xdeadbeef..."',
      "",
      "$ grep 'trace' block_explorer",
      "> Attacker reads on-chain traces",
      "> Extracts validation logic",
      "",
      "🔴  INTERNAL LOGIC EXPOSED",
      "> Attacker now knows exact bypass conditions",
    ],
    impact: "Complete validator logic exposed to attackers",
    prevention: "Remove all trace/traceShow calls before deployment",
  },
  "Unsafe I/O Import": {
    vulnerability: "System.IO — Side Channel Attack",
    severity: "high",
    terminalLines: [
      "$ grep 'System.IO' MyValidator.hs",
      "> import System.IO  ← FOUND",
      "",
      "$ exploit.sh",
      "> Triggering I/O during validation...",
      "",
      "⚠  UNAUTHORIZED I/O",
      "> readFile called during script execution",
      "> Network request initiated",
      "> File system accessed",
      "",
      "💥  NON-DETERMINISTIC BEHAVIOR",
      "> Node A: validator passes",
      "> Node B: validator fails",
      "> Consensus broken",
      "",
      "🔴  NETWORK CONSENSUS AT RISK",
    ],
    impact: "Blockchain consensus failure possible",
    prevention: "Remove System.IO. Move all I/O to off-chain code.",
  },
  "Empty Hash Values": {
    vulnerability: "Empty PubKeyHash — Auth Bypass",
    severity: "high",
    terminalLines: [
      "$ cat attack.json",
      '> {"datum": "0x", "redeemer": "admin"}',
      "",
      "$ submit-attack.sh",
      "> Sending empty hash as owner...",
      "",
      "⚠  HASH COMPARISON BYPASSED",
      "> expectedHash: 0x (empty)",
      "> actualHash: 0x (empty)",
      "> 0x == 0x → TRUE",
      "",
      "🔓  AUTHORIZATION GRANTED",
      "> Attacker authenticated as owner",
      "",
      "💰  WITHDRAWING ALL FUNDS",
      "> 100,000.00 ADA transferred to attacker",
      "",
      "🔴  COMPLETE AUTH BYPASS",
    ],
    impact: "100,000 ADA stolen via empty hash exploit",
    prevention: "Validate hash length > 0 and matches expected non-empty hash",
  },
  "Hardcoded Slot Numbers": {
    vulnerability: "Hardcoded Slots — Post-Fork Failure",
    severity: "medium",
    terminalLines: [
      "$ grep 'slot >' MyValidator.hs",
      "> slot > 45000000  ← HARDCODED",
      "",
      "# After Cardano hard fork...",
      "",
      "$ cardano-cli query tip",
      "> Current slot: 45,000,001",
      "> But validator expects: 45,000,000",
      "",
      "⚠  TIME PARAMETER CHANGED",
      "> Slot length changed from 1s to 2s",
      "> All hardcoded values now wrong",
      "",
      "💥  VALIDATOR REJECTS ALL TX",
      "> Every transaction fails validation",
      "> Contract frozen indefinitely",
      "",
      "🔴  CONTRACT UNUSABLE UNTIL UPGRADE",
    ],
    impact: "All user funds locked, emergency governance needed",
    prevention: "Use POSIXTime ranges or parameterize slot references",
  },
};

export function getAttackSimulation(vulnTitle: string): AttackSimulation | null {
  for (const [key, sim] of Object.entries(ATTACK_SCRIPTS)) {
    if (vulnTitle.toLowerCase().includes(key.toLowerCase())) {
      return sim;
    }
  }
  return null;
}

export default function AttackSimulator({ simulation }: { simulation: AttackSimulation }) {
  const [expanded, setExpanded] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [showImpact, setShowImpact] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) {
      setVisibleLines(0);
      setShowImpact(false);
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleLines(i);

      const line = simulation.terminalLines[i - 1] || "";
      if (line.includes("🔴") || line.includes("💰") || line.includes("💥")) {
        setFlashing(true);
        setTimeout(() => setFlashing(false), 300);
      }

      if (i >= simulation.terminalLines.length) {
        clearInterval(interval);
        setTimeout(() => setShowImpact(true), 400);
      }
    }, expanded ? 120 : 0);

    return () => clearInterval(interval);
  }, [expanded, simulation.terminalLines.length]);

  const sevColor = simulation.severity === "critical" ? "#ef4444" : simulation.severity === "high" ? "#f97316" : "#eab308";

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${flashing ? "animate-pulse" : ""}`}
      style={{ borderColor: `${sevColor}30`, background: flashing ? `${sevColor}15` : `${sevColor}05` }}>
      
      <button onClick={() => { setExpanded(!expanded); setVisibleLines(0); setShowImpact(false); }}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition hover:bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${sevColor}20` }}>
            <svg className="h-4 w-4" style={{ color: sevColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold block" style={{ color: sevColor }}>Simulate Attack</span>
            <span className="text-[10px] text-gray-500">Watch how this exploit works in real-time</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!expanded && <span className="text-[10px] text-gray-600">Click to run</span>}
          <svg className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div ref={containerRef} className="px-4 pb-4">
          <div className="rounded-xl bg-[#0a0a12] border border-white/[0.06] overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]" style={{ background: `${sevColor}10` }}>
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <span className="text-[10px] text-gray-500 font-mono">attack-simulation.sh — bash</span>
            </div>

            {/* Terminal body */}
            <div className="p-3 font-mono text-[11px] leading-relaxed max-h-[400px] overflow-y-auto">
              {simulation.terminalLines.slice(0, visibleLines).map((line, i) => {
                const isWarning = line.startsWith("⚠");
                const isImpact = line.startsWith("🔴") || line.startsWith("💰") || line.startsWith("💥");
                const isCmd = line.startsWith("$");
                const isComment = line.startsWith("#");
                const isEmpty = line === "";

                if (isEmpty) return <div key={i} className="h-2" />;

                return (
                  <div key={i} className={`transition-all duration-300 ${isImpact ? "font-bold text-base py-1" : ""}`}
                    style={{
                      color: isImpact ? sevColor : isWarning ? "#fbbf24" : isCmd ? "#10b981" : isComment ? "#6b7280" : "#d1d5db",
                      animation: isImpact ? "fadeInUp 0.3s ease" : undefined,
                    }}>
                    {isCmd && <span className="text-emerald-500 mr-1">❯</span>}
                    {isWarning && <span className="mr-1">⚠</span>}
                    {line}
                    {i === visibleLines - 1 && <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: sevColor }} />}
                  </div>
                );
              })}

              {visibleLines >= simulation.terminalLines.length && showImpact && (
                <div className="mt-4 space-y-3 animate-in" style={{ animation: "fadeInUp 0.5s ease" }}>
                  <div className="border-t border-white/[0.06] pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ background: `${sevColor}30` }}>
                        <svg className="h-2.5 w-2.5" style={{ color: sevColor }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: sevColor }}>Simulation Complete</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="rounded-lg p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                        <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">💥 Impact</div>
                        <div className="text-[11px] text-gray-300 leading-relaxed">{simulation.impact}</div>
                      </div>
                      <div className="rounded-lg p-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">✅ Prevention</div>
                        <div className="text-[11px] text-gray-300 leading-relaxed">{simulation.prevention}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
