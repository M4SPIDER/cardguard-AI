"use client";

import { useState } from "react";

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  oldNum: number | null;
  newNum: number | null;
  content: string;
}

function computeDiff(oldCode: string, newCode: string): DiffLine[] {
  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const lcs: number[][] = [];
  for (let i = 0; i <= oldLines.length; i++) {
    lcs[i] = [];
    for (let j = 0; j <= newLines.length; j++) {
      if (i === 0 || j === 0) {
        lcs[i][j] = 0;
      } else if (oldLines[i - 1] === newLines[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  let i = oldLines.length;
  let j = newLines.length;
  const tempLines: { type: "added" | "removed" | "unchanged"; oldNum: number | null; newNum: number | null; content: string }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      tempLines.unshift({ type: "unchanged", oldNum: i, newNum: j, content: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      tempLines.unshift({ type: "added", oldNum: null, newNum: j, content: newLines[j - 1] });
      j--;
    } else if (i > 0) {
      tempLines.unshift({ type: "removed", oldNum: i, newNum: null, content: oldLines[i - 1] });
      i--;
    }
  }

  return tempLines;
}

export default function DiffViewer({ oldCode, newCode, language }: { oldCode: string; newCode: string; language: string }) {
  const [view, setView] = useState<"split" | "unified">("split");
  const diff = computeDiff(oldCode, newCode);

  const addedCount = diff.filter((d) => d.type === "added").length;
  const removedCount = diff.filter((d) => d.type === "removed").length;

  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");

  return (
    <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{ background: "rgba(10,10,26,0.8)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-semibold text-white/80">AI Auto-Fix</span>
          <span className="text-[10px] text-gray-500">by {language}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-red-400">-{removedCount}</span>
          <span className="text-[10px] text-emerald-400">+{addedCount}</span>
          <div className="flex gap-1 ml-2">
            <button onClick={() => setView("split")}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition ${view === "split" ? "bg-white/[0.08] text-white" : "text-gray-500 hover:text-gray-300"}`}>
              Split
            </button>
            <button onClick={() => setView("unified")}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition ${view === "unified" ? "bg-white/[0.08] text-white" : "text-gray-500 hover:text-gray-300"}`}>
              Unified
            </button>
          </div>
        </div>
      </div>

      {view === "split" ? (
        /* Split view */
        <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
          <div>
            <div className="px-3 py-1.5 text-[10px] font-medium text-red-400/60 border-b border-white/[0.04] uppercase tracking-wider">Before</div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              {oldLines.map((line, i) => {
                const isChanged = !newLines.includes(line) || diff.some(d => d.type === "removed" && d.oldNum === i + 1);
                return (
                  <div key={i} className={`flex font-mono text-[11px] leading-5 ${isChanged ? "bg-red-500/10" : ""}`}>
                    <span className="w-10 text-right pr-2 text-gray-600 select-none shrink-0">{i + 1}</span>
                    <span className={`px-2 ${isChanged ? "text-red-400/80" : "text-gray-500"}`}>{isChanged ? "−" : ""}</span>
                    <span className={`pr-4 ${isChanged ? "text-red-300/80" : "text-gray-400/60"}`}>{line}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="px-3 py-1.5 text-[10px] font-medium text-emerald-400/60 border-b border-white/[0.04] uppercase tracking-wider">After</div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              {newLines.map((line, i) => {
                const isChanged = !oldLines.includes(line) || diff.some(d => d.type === "added" && d.newNum === i + 1);
                return (
                  <div key={i} className={`flex font-mono text-[11px] leading-5 ${isChanged ? "bg-emerald-500/10" : ""}`}>
                    <span className="w-10 text-right pr-2 text-gray-600 select-none shrink-0">{i + 1}</span>
                    <span className={`px-2 ${isChanged ? "text-emerald-400/80" : "text-gray-500"}`}>{isChanged ? "+" : ""}</span>
                    <span className={`pr-4 ${isChanged ? "text-emerald-300/80" : "text-gray-400/60"}`}>{line}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Unified view */
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          {diff.map((line, i) => (
            <div key={i} className={`flex font-mono text-[11px] leading-5 ${
              line.type === "added" ? "bg-emerald-500/10" : line.type === "removed" ? "bg-red-500/10" : ""
            }`}>
              <span className="w-8 text-right pr-1 text-gray-600 select-none shrink-0">{line.oldNum || ""}</span>
              <span className="w-8 text-right pr-1 text-gray-600 select-none shrink-0">{line.newNum || ""}</span>
              <span className={`w-5 text-center select-none shrink-0 ${
                line.type === "added" ? "text-emerald-400" : line.type === "removed" ? "text-red-400" : "text-gray-600"
              }`}>
                {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
              </span>
              <span className={`pr-4 ${
                line.type === "added" ? "text-emerald-300/80" : line.type === "removed" ? "text-red-300/80" : "text-gray-400/60"
              }`}>{line.content}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] text-[10px] text-gray-600">
        <span>{oldLines.length} lines → {newLines.length} lines</span>
        <span>{addedCount} additions, {removedCount} deletions</span>
      </div>
    </div>
  );
}
