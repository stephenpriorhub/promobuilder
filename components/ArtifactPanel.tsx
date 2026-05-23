"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface ResearchCard {
  type: "stat" | "fact" | "quote" | "angle";
  headline: string;
  content: string;
  copyUse: string;
}

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  cards: ResearchCard[];
}

type Tab = "headlines" | "outline" | "vsl" | "research";

interface ArtifactPanelProps {
  headlinesContent: string;
  outlineContent: string;
  vslContent: string;
  researchSources: ResearchSource[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onAddResearch: (url: string) => Promise<void>;
  isResearching: boolean;
  isStreaming: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  stat: "bg-green-900 text-green-300 border-green-700",
  fact: "bg-blue-900 text-blue-300 border-blue-700",
  quote: "bg-purple-900 text-purple-300 border-purple-700",
  angle: "bg-orange-900 text-orange-300 border-orange-700",
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-xs font-mono px-3 py-1.5 rounded border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200 transition-colors"
    >
      {copied ? "COPIED" : label}
    </button>
  );
}

function DownloadButton({
  text,
  filename,
  label,
}: {
  text: string;
  filename: string;
  label: string;
}) {
  return (
    <button
      onClick={() => {
        const blob = new Blob([text], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      }}
      className="text-xs font-mono px-3 py-1.5 rounded border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200 transition-colors"
    >
      {label}
    </button>
  );
}

function ArtifactContent({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  if (!content) return null;
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-green-400 font-bold text-base mt-6 mb-2 font-mono">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-green-500 font-semibold text-sm mt-5 mb-2 font-mono">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-gray-300 font-semibold text-sm mt-4 mb-1">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-gray-300 text-sm leading-relaxed mb-3">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="text-white font-semibold">{children}</strong>
          ),
          li: ({ children }) => (
            <li className="text-gray-300 text-sm mb-1">{children}</li>
          ),
          hr: () => <hr className="border-gray-700 my-4" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-green-700 pl-3 text-gray-400 italic text-sm my-3">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-green-500 animate-pulse ml-0.5 align-middle" />
      )}
    </div>
  );
}

function EmptyTabState({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center mb-4">
        <span className="text-gray-600 text-lg">○</span>
      </div>
      <p className="text-gray-500 text-sm font-mono mb-1">{label}</p>
      <p className="text-gray-700 text-xs">{hint}</p>
    </div>
  );
}

export default function ArtifactPanel({
  headlinesContent,
  outlineContent,
  vslContent,
  researchSources,
  activeTab,
  onTabChange,
  onAddResearch,
  isResearching,
  isStreaming,
}: ArtifactPanelProps) {
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const urlInputRef = useRef<HTMLInputElement>(null);

  const tabs: { id: Tab; label: string; hasContent: boolean }[] = [
    {
      id: "headlines",
      label: "Headlines & Lead",
      hasContent: headlinesContent.length > 0,
    },
    {
      id: "outline",
      label: "Outline",
      hasContent: outlineContent.length > 0,
    },
    {
      id: "vsl",
      label: "Full VSL",
      hasContent: vslContent.length > 0,
    },
    {
      id: "research",
      label: `Research${researchSources.length > 0 ? ` (${researchSources.reduce((n, s) => n + s.cards.length, 0)})` : ""}`,
      hasContent: researchSources.length > 0,
    },
  ];

  const handleAddUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setUrlError("");
    try {
      new URL(url);
    } catch {
      setUrlError("Enter a valid URL (include https://)");
      return;
    }
    setUrlInput("");
    try {
      await onAddResearch(url);
    } catch {
      setUrlError("Failed to fetch that URL. Try another.");
    }
  };

  // Extract word count for VSL tab
  const vslWordCount = vslContent
    ? vslContent.split(/\s+/).filter(Boolean).length
    : 0;

  // Extract clean content from between markers for display
  function extractDisplayContent(
    raw: string,
    startMarker: string,
    endMarker: string
  ): string {
    const start = raw.indexOf(startMarker);
    if (start === -1) return raw;
    const lineEnd = raw.indexOf("\n", start);
    const contentStart = lineEnd === -1 ? start + startMarker.length : lineEnd + 1;
    const end = raw.indexOf(endMarker);
    return end === -1
      ? raw.slice(contentStart)
      : raw.slice(contentStart, end).trim();
  }

  const displayHeadlines = extractDisplayContent(
    headlinesContent,
    "===== HEADLINES & LEAD:",
    "===== END HEADLINES ====="
  );
  const displayOutline = extractDisplayContent(
    outlineContent,
    "===== OUTLINE:",
    "===== END OUTLINE ====="
  );
  const displayVsl = extractDisplayContent(
    vslContent,
    "VIDEO SCRIPT BEGINS",
    "END OF SCRIPT"
  );

  const isStreamingThisTab = (tab: Tab) => {
    if (!isStreaming) return false;
    if (tab === "headlines" && headlinesContent.length > 0 && !headlinesContent.includes("===== END HEADLINES =====")) return true;
    if (tab === "outline" && outlineContent.length > 0 && !outlineContent.includes("===== END OUTLINE =====")) return true;
    if (tab === "vsl" && vslContent.length > 0 && !vslContent.includes("END OF SCRIPT")) return true;
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const streaming = isStreamingThisTab(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-3 text-xs font-mono transition-colors relative flex items-center gap-1.5 ${
                active
                  ? "text-green-400 border-b-2 border-green-500"
                  : tab.hasContent
                  ? "text-gray-300 hover:text-gray-100"
                  : "text-gray-600 hover:text-gray-500"
              }`}
            >
              {tab.hasContent && !active && (
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    streaming ? "bg-green-500 animate-pulse" : "bg-gray-600"
                  }`}
                />
              )}
              {streaming && active && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {/* Headlines & Lead */}
        {activeTab === "headlines" && (
          <div className="p-6">
            {headlinesContent ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 text-xs font-mono uppercase tracking-wide">
                    Stage 1 — Headlines & Lead
                  </span>
                  <div className="flex gap-2">
                    <CopyButton text={headlinesContent} label="COPY" />
                    <DownloadButton
                      text={headlinesContent}
                      filename="headlines-lead.md"
                      label="DOWNLOAD"
                    />
                  </div>
                </div>
                <ArtifactContent
                  content={displayHeadlines}
                  isStreaming={isStreamingThisTab("headlines")}
                />
              </>
            ) : (
              <EmptyTabState
                label="Headlines & Lead not yet generated"
                hint="Complete the interview, then type HEADLINES or YES to generate 3 headline options and your opening lead."
              />
            )}
          </div>
        )}

        {/* Outline */}
        {activeTab === "outline" && (
          <div className="p-6">
            {outlineContent ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 text-xs font-mono uppercase tracking-wide">
                    Stage 2 — Outline
                  </span>
                  <div className="flex gap-2">
                    <CopyButton text={outlineContent} label="COPY" />
                    <DownloadButton
                      text={outlineContent}
                      filename="vsl-outline.md"
                      label="DOWNLOAD"
                    />
                  </div>
                </div>
                <ArtifactContent
                  content={displayOutline}
                  isStreaming={isStreamingThisTab("outline")}
                />
              </>
            ) : (
              <EmptyTabState
                label="Outline not yet generated"
                hint="After reviewing your headlines, type OUTLINE to generate the full section-by-section structure."
              />
            )}
          </div>
        )}

        {/* Full VSL */}
        {activeTab === "vsl" && (
          <div className="p-6">
            {vslContent ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 text-xs font-mono uppercase tracking-wide">
                      Stage 3 — Full VSL
                    </span>
                    {vslWordCount > 0 && (
                      <span className="text-green-700 text-xs font-mono">
                        ~{vslWordCount.toLocaleString()} words
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <CopyButton text={vslContent} label="COPY" />
                    <DownloadButton
                      text={vslContent}
                      filename="vsl-script.md"
                      label="DOWNLOAD .MD"
                    />
                    <DownloadButton
                      text={vslContent}
                      filename="vsl-script.txt"
                      label="DOWNLOAD .TXT"
                    />
                  </div>
                </div>
                <ArtifactContent
                  content={displayVsl || vslContent}
                  isStreaming={isStreamingThisTab("vsl")}
                />
              </>
            ) : (
              <EmptyTabState
                label="Full VSL not yet generated"
                hint="After approving your outline, type VSL to generate the complete 9,000–12,000 word script."
              />
            )}
          </div>
        )}

        {/* Research Cards */}
        {activeTab === "research" && (
          <div className="p-6">
            <div className="mb-5">
              <p className="text-gray-400 text-xs font-mono uppercase tracking-wide mb-3">
                Index Card System
              </p>
              <p className="text-gray-500 text-xs mb-4">
                Paste a URL from your research. The copy director will extract
                key facts, statistics, quotes, and angles — and use them when
                generating your headlines, outline, and VSL.
              </p>
              <div className="flex gap-2">
                <input
                  ref={urlInputRef}
                  type="url"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setUrlError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddUrl();
                  }}
                  placeholder="https://example.com/article"
                  className="flex-1 bg-gray-900 border border-gray-700 focus:border-green-600 rounded px-3 py-2 text-gray-200 text-sm placeholder-gray-600 outline-none transition-colors font-mono"
                  disabled={isResearching}
                />
                <button
                  onClick={handleAddUrl}
                  disabled={isResearching || !urlInput.trim()}
                  className="bg-green-800 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-600 text-white px-4 py-2 rounded text-xs font-mono transition-colors flex-shrink-0"
                >
                  {isResearching ? "READING..." : "ADD"}
                </button>
              </div>
              {urlError && (
                <p className="text-red-400 text-xs mt-1.5 font-mono">{urlError}</p>
              )}
            </div>

            {researchSources.length === 0 && !isResearching && (
              <div className="border border-dashed border-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-600 text-xs font-mono">
                  No research cards yet
                </p>
              </div>
            )}

            {isResearching && (
              <div className="border border-gray-800 rounded-lg p-4 mb-4 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-ping" />
                  <span className="text-gray-500 text-xs font-mono">
                    Analyzing page...
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {researchSources.map((source) => (
                <div key={source.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-gray-500 text-xs font-mono truncate">
                      {source.title}
                    </span>
                    <span className="text-gray-700 text-xs truncate flex-1">
                      — {source.url}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {source.cards.map((card, i) => (
                      <div
                        key={i}
                        className="bg-gray-900 border border-gray-800 rounded-lg p-4"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <span
                            className={`text-xs font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${
                              TYPE_COLORS[card.type] ||
                              TYPE_COLORS["fact"]
                            }`}
                          >
                            {card.type.toUpperCase()}
                          </span>
                          <span className="text-gray-200 text-xs font-semibold leading-tight">
                            {card.headline}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed mb-2">
                          {card.content}
                        </p>
                        {card.copyUse && (
                          <p className="text-gray-600 text-xs italic border-t border-gray-800 pt-2 mt-2">
                            {card.copyUse}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
