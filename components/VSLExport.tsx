"use client";

import { useState } from "react";

interface Props {
  content: string;
}

export default function VSLExport({ content }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    // Extract headline for filename
    const headlineMatch = content.match(/===== VSL:\s*(.+?)\s*=====/);
    const headline = headlineMatch
      ? headlineMatch[1].replace(/[^a-zA-Z0-9\s]/g, "").trim().slice(0, 50)
      : "VSL-Script";
    const filename = `${headline.replace(/\s+/g, "-")}.txt`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMD = () => {
    const headlineMatch = content.match(/===== VSL:\s*(.+?)\s*=====/);
    const headline = headlineMatch
      ? headlineMatch[1].replace(/[^a-zA-Z0-9\s]/g, "").trim().slice(0, 50)
      : "VSL-Script";
    const filename = `${headline.replace(/\s+/g, "-")}.md`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="text-xs font-mono bg-green-900 hover:bg-green-800 text-green-300 px-3 py-1.5 rounded transition-colors"
      >
        {copied ? "✓ COPIED" : "COPY VSL"}
      </button>
      <button
        onClick={handleDownload}
        className="text-xs font-mono bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors"
      >
        .TXT
      </button>
      <button
        onClick={handleDownloadMD}
        className="text-xs font-mono bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors"
      >
        .MD
      </button>
    </div>
  );
}
