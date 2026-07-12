"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className={`flex items-center justify-between rounded-2xl px-5 py-3 transition-all duration-300 ${
          scrolled ? "glass-strong shadow-lg shadow-black/20" : "glass"
        }`}>
          <Link href="/" className="flex items-center gap-2 text-lg font-bold shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #0033ad, #1a5cff)" }}>
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="gradient-text hidden sm:inline">CardGuard</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/audit">Audit</NavLink>
            <a href="https://www.indiacodex.com/" target="_blank" rel="noopener noreferrer"
              className="rounded-xl px-4 py-2 text-sm text-gray-400 transition hover:text-white/90">
              IndiaCodex
            </a>
            <Link href="/audit"
              className="ml-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #0033ad, #1a5cff)" }}>
              Start Audit
            </Link>
          </div>

          <button className="md:hidden text-gray-400 hover:text-white transition p-1"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden mt-2 rounded-2xl p-3 animate-in" style={{ background: "rgba(10,10,26,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex flex-col">
              <Link href="/" onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm text-gray-300 hover:bg-white/5">Home</Link>
              <Link href="/audit" onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm text-gray-300 hover:bg-white/5">Audit</Link>
              <Link href="/audit" onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-xl px-5 py-3 text-center text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #0033ad, #1a5cff)" }}>
                Start Audit
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
      className="rounded-xl px-4 py-2 text-sm text-gray-400 transition hover:text-white/90 hover:bg-white/5">
      {children}
    </Link>
  );
}
