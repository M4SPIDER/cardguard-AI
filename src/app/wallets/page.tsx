"use client";

import Link from "next/link";
import { useState } from "react";

const WALLETS = [
  {
    id: "nami",
    name: "Nami",
    color: "#1a5cff",
    url: "https://namiwallet.io",
    chrome: "https://chromewebstore.google.com/detail/nami/wmhkejpfhcmgbmocpolgpjemankmcdjp",
    description: "Most popular Cardano wallet. Simple, clean, widely supported.",
    features: ["Simple UI", "Token management", "Hardware wallet support", "dApp connector"],
    installTime: "2 min",
    difficulty: "Easy",
  },
  {
    id: "eternl",
    name: "Eternl",
    color: "#8b5cf6",
    url: "https://eternl.io",
    chrome: "https://chromewebstore.google.com/detail/eternl/knhkaaacgfgbiedbbhifhpbodnfcnmil",
    description: "Feature-rich wallet with staking, portfolio, and advanced features.",
    features: ["Staking dashboard", "Portfolio tracker", "Multi-wallet", "Collateral management"],
    installTime: "3 min",
    difficulty: "Easy",
  },
  {
    id: "yoroi",
    name: "Yoroi",
    color: "#3b82f6",
    url: "https://yoroi-wallet.com",
    chrome: "https://chromewebstore.google.com/detail/yoroi-ledger-nano-s/hcailhhepfiompknmckadodjbcmhnhia",
    description: "Lightweight wallet by EMURGO. Great for beginners.",
    features: ["Lightweight", "Fast sync", "Ledger support", "Multi-language"],
    installTime: "2 min",
    difficulty: "Easy",
  },
  {
    id: "flint",
    name: "Flint",
    color: "#f97316",
    url: "https://flintwallet.io",
    chrome: "https://chromewebstore.google.com/detail/flint/dgjkhhcdlbhhfhpjmpfbameglnlliplk",
    description: "Developer-friendly wallet with advanced script support.",
    features: ["Script support", "Developer tools", "dApp browser", "Multi-chain ready"],
    installTime: "2 min",
    difficulty: "Medium",
  },
  {
    id: "typhon",
    name: "Typhon",
    color: "#10b981",
    url: "https://typhonwallet.co",
    chrome: "https://chromewebstore.google.com/detail/typhon-wallet/kfdmeiefdjkiidjablpfnpeapfbnmgnl",
    description: "Advanced wallet with governance and catalyst voting.",
    features: ["Catalyst voting", "Governance", "Multi-sig support", "Advanced Tx builder"],
    installTime: "3 min",
    difficulty: "Advanced",
  },
];

export default function WalletsPage() {
  const [installed, setInstalled] = useState<Record<string, boolean>>({});

  const checkInstalled = (walletId: string) => {
    const w = (window as unknown as { cardano?: Record<string, unknown> }).cardano;
    return !!(w && w[walletId]);
  };

  const handleCheck = () => {
    const status: Record<string, boolean> = {};
    WALLETS.forEach((w) => { status[w.id] = checkInstalled(w.id); });
    setInstalled(status);
  };

  return (
    <div className="relative min-h-screen grid-bg">
      <div className="mesh-gradient fixed inset-0 pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-16">
        <div className="mb-10">
          <Link href="/audit" className="text-xs text-gray-500 hover:text-gray-300 transition">← Back to Audit</Link>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-white/90">Cardano Wallets</h1>
          <p className="mt-1 text-sm text-white/40">Install a wallet to connect to CardGuard AI and store audits on-chain</p>
          <button onClick={handleCheck}
            className="mt-4 rounded-xl px-4 py-2 text-xs font-semibold text-white transition hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #0033ad, #1a5cff)" }}>
            Check Installed
          </button>
        </div>

        <div className="space-y-4">
          {WALLETS.map((wallet) => (
            <div key={wallet.id} className="glass-strong rounded-2xl p-6 card-3d-subtle transition hover:bg-white/[0.04]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-14 w-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0"
                    style={{ background: wallet.color }}>
                    {wallet.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white/90">{wallet.name}</h3>
                      {installed[wallet.id] !== undefined && (
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          installed[wallet.id] ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                        }`}>
                          {installed[wallet.id] ? "Installed" : "Not Found"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">{wallet.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {wallet.features.map((f) => (
                        <span key={f} className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] text-gray-400">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <a href={wallet.chrome} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition hover:scale-[1.02]"
                    style={{ background: wallet.color }}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    Install {wallet.name}
                  </a>
                  <div className="flex items-center gap-2 text-[10px] text-gray-600">
                    <span>{wallet.installTime}</span>
                    <span>·</span>
                    <span>{wallet.difficulty}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 glass-strong rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white/80 mb-3">How to Connect</h3>
          <ol className="space-y-2 text-xs text-white/40 list-decimal list-inside">
            <li>Click &quot;Install&quot; above to go to Chrome Web Store</li>
            <li>Click &quot;Add to Chrome&quot; to install the extension</li>
            <li>Create a new wallet or import with seed phrase</li>
            <li>Make sure wallet is <strong className="text-white/60">unlocked</strong></li>
            <li>Go back to CardGuard AI and click &quot;Connect Wallet&quot;</li>
            <li>Select your wallet and approve the connection</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
