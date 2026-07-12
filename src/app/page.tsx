"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  return (
    <div className="relative min-h-screen grid-bg overflow-hidden">
      <div className="mesh-gradient fixed inset-0 pointer-events-none" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full blur-[120px] animate-float" style={{ background: "rgba(0, 51, 173, 0.2)" }} />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full blur-[100px] animate-float" style={{ background: "rgba(26, 92, 255, 0.15)", animationDelay: "2s" }} />
      </div>

      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-32 sm:pt-40 pb-24">
        <div className={`text-center transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm text-gray-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "#1a5cff" }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "#1a5cff" }} />
            </span>
            Live on Cardano
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight tracking-tight">
            <span className="text-white/90">Audit Your</span>
            <br />
            <span className="gradient-text">Smart Contracts</span>
            <br />
            <span className="text-3xl sm:text-4xl md:text-5xl font-light text-white/40">with AI</span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-base sm:text-lg text-white/40 leading-relaxed">
            Scan Cardano Plutus & Aiken contracts for vulnerabilities.
            AI-powered analysis, on-chain reports, zero cost.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/audit"
              className="glow-cardano group rounded-2xl px-8 py-4 text-base font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #0033ad, #1a5cff)" }}>
              <span className="flex items-center gap-2">
                Start Audit
                <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <a href="https://github.com/IndiaCodex26" target="_blank" rel="noopener noreferrer"
              className="glass rounded-2xl px-8 py-4 text-base font-semibold text-gray-300 transition-all hover:bg-white/[0.06] hover:scale-[1.03] active:scale-[0.98]">
              GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        <div className={`grid gap-4 sm:gap-5 md:grid-cols-3 transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          {[
            { icon: <ScanIcon />, title: "AI-Powered Analysis", desc: "16+ vulnerability patterns across Plutus, Aiken, and Marlowe contracts." },
            { icon: <ShieldIcon />, title: "Risk Scoring", desc: "0-100 risk score with severity breakdowns for every issue found." },
            { icon: <ChainIcon />, title: "On-Chain Reports", desc: "Store audit hashes on Cardano via CIP-25 metadata." },
            { icon: <WalletIcon />, title: "Wallet Integration", desc: "Connect Nami, Eternl, or Yoroi to submit audits on-chain." },
            { icon: <CodeIcon />, title: "Multi-Language", desc: "Full support for Plutus, Aiken, and Marlowe smart contracts." },
            { icon: <BoltIcon />, title: "Instant Results", desc: "Full security audit in under 5 seconds. No waiting." },
          ].map((f) => (
            <div key={f.title} className="card-3d glass rounded-2xl p-6">
              <div className="mb-4 inline-flex rounded-xl p-3" style={{ background: "rgba(0, 51, 173, 0.15)" }}>
                {f.icon}
              </div>
              <h3 className="mb-2 text-base font-semibold text-white/90">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-4xl px-4 sm:px-6 pb-20">
        <div className={`glass-strong rounded-3xl p-6 sm:p-10 card-3d-subtle transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
            {[
              { num: "16+", label: "Checks" },
              { num: "3", label: "Languages" },
              { num: "<5s", label: "Scan Time" },
              { num: "∞", label: "Free" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold gradient-text-cardano">{s.num}</div>
                <div className="mt-1 text-xs sm:text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 pb-16 text-center">
        <p className="text-xs text-gray-600">
          Built for IndiaCodex&apos;26 &middot; Powered by Cardano & Project Catalyst
        </p>
      </section>
    </div>
  );
}

function ScanIcon() {
  return <svg className="h-5 w-5" style={{ color: "#4d8bff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
}
function ShieldIcon() {
  return <svg className="h-5 w-5" style={{ color: "#4d8bff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
}
function ChainIcon() {
  return <svg className="h-5 w-5" style={{ color: "#4d8bff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>;
}
function WalletIcon() {
  return <svg className="h-5 w-5" style={{ color: "#4d8bff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>;
}
function CodeIcon() {
  return <svg className="h-5 w-5" style={{ color: "#4d8bff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>;
}
function BoltIcon() {
  return <svg className="h-5 w-5" style={{ color: "#4d8bff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>;
}
