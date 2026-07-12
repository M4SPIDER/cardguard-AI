import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CardGuard AI — Cardano Smart Contract Auditor",
  description: "AI-powered security auditor for Cardano smart contracts. Scan Plutus & Aiken contracts for vulnerabilities instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="relative border-t border-white/[0.06] py-8">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <p className="text-xs text-gray-600">
              CardGuard AI &middot; Built for IndiaCodex&apos;26 &middot; Powered by Cardano & Project Catalyst
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
