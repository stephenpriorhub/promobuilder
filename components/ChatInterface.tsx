"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { INITIAL_MESSAGE } from "@/lib/system-prompt";
import {
  saveProject,
  getProject,
  deriveProjectName,
  ProjectDraft,
} from "@/lib/storage";
import MessageBubble from "./MessageBubble";
import ArtifactPanel, { ResearchSource } from "./ArtifactPanel";
import ProjectsModal from "./ProjectsModal";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

type ArtifactTab = "headlines" | "outline" | "vsl" | "research";

function extractArtifact(
  content: string,
  startMarker: string,
): string | null {
  const start = content.indexOf(startMarker);
  if (start === -1) return null;
  return content.slice(start);
}

function bestTab(
  headlinesContent: string,
  outlineContent: string,
  vslContent: string,
  researchSources: ResearchSource[]
): ArtifactTab {
  if (vslContent) return "vsl";
  if (outlineContent) return "outline";
  if (headlinesContent) return "headlines";
  if (researchSources.length > 0) return "research";
  return "research";
}

export default function ChatInterface() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: INITIAL_MESSAGE, id: "initial" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  // Artifact state
  const [headlinesContent, setHeadlinesContent] = useState("");
  const [outlineContent, setOutlineContent] = useState("");
  const [vslContent, setVslContent] = useState("");
  const [activeTab, setActiveTab] = useState<ArtifactTab>("research");

  // Research state
  const [researchSources, setResearchSources] = useState<ResearchSource[]>([]);
  const [isResearching, setIsResearching] = useState(false);

  // Project state
  const [projectId, setProjectId] = useState<string | null>(null);
  const [showProjectsModal, setShowProjectsModal] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasLoadingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  // ── Load from URL on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const id = searchParams.get("id");
    if (!id) return;

    (async () => {
      const draft = await getProject(id);
      if (!draft) {
        router.replace("/builder");
        return;
      }

      setProjectId(draft.id);
      setMessages(draft.messages);
      setHeadlinesContent(draft.headlinesContent);
      setOutlineContent(draft.outlineContent);
      setVslContent(draft.vslContent);
      setResearchSources(draft.researchSources);
      setActiveTab(
        bestTab(
          draft.headlinesContent,
          draft.outlineContent,
          draft.vslContent,
          draft.researchSources
        )
      );
    })();
  });

  // ── Auto-save when an AI response completes ────────────────────────────────
  useEffect(() => {
    if (!wasLoadingRef.current || isLoading) {
      wasLoadingRef.current = isLoading;
      return;
    }
    wasLoadingRef.current = false;

    // Only save once there's real conversation content
    if (messages.length <= 1) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      const existingId = projectId;
      const id = existingId ?? crypto.randomUUID();

      if (!existingId) {
        setProjectId(id);
        router.replace(`/builder?id=${id}`, { scroll: false });
      }

      const existingDraft = existingId ? await getProject(existingId) : null;

      await saveProject({
        id,
        name: deriveProjectName(messages),
        createdAt: existingDraft?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages,
        headlinesContent,
        outlineContent,
        vslContent,
        researchSources,
      });
    }, 500);
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save when research cards change (if project already exists) ────────
  useEffect(() => {
    if (!projectId || researchSources.length === 0) return;
    (async () => {
      const existing = await getProject(projectId);
      if (!existing) return;
      await saveProject({ ...existing, researchSources });
    })();
  }, [researchSources, projectId]);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // ── Textarea auto-resize ────────────────────────────────────────────────────
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      role: "user",
      content: trimmed,
      id: Date.now().toString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          researchCards: researchSources,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        setStreamingContent(fullContent);

        if (fullContent.includes("===== HEADLINES & LEAD:")) {
          const extracted = extractArtifact(fullContent, "===== HEADLINES & LEAD:");
          if (extracted) {
            setHeadlinesContent(extracted);
            setActiveTab("headlines");
          }
        } else if (fullContent.includes("===== OUTLINE:")) {
          const extracted = extractArtifact(fullContent, "===== OUTLINE:");
          if (extracted) {
            setOutlineContent(extracted);
            setActiveTab("outline");
          }
        } else if (
          fullContent.includes("===== VSL:") ||
          fullContent.includes("VIDEO SCRIPT BEGINS")
        ) {
          setVslContent(fullContent);
          setActiveTab("vsl");
        }
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: fullContent,
        id: Date.now().toString() + "-assistant",
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingContent("");

      // Final artifact extraction
      if (fullContent.includes("===== HEADLINES & LEAD:")) {
        const extracted = extractArtifact(fullContent, "===== HEADLINES & LEAD:");
        if (extracted) setHeadlinesContent(extracted);
      }
      if (fullContent.includes("===== OUTLINE:")) {
        const extracted = extractArtifact(fullContent, "===== OUTLINE:");
        if (extracted) setOutlineContent(extracted);
      }
      if (fullContent.includes("===== VSL:") || fullContent.includes("VIDEO SCRIPT BEGINS")) {
        setVslContent(fullContent);
      }
    } catch (err) {
      console.error(err);
      const errorMsg: Message = {
        role: "assistant",
        content:
          "Something went wrong. Check that your ANTHROPIC_API_KEY is set in .env.local and restart the server.",
        id: Date.now().toString() + "-error",
      };
      setMessages((prev) => [...prev, errorMsg]);
      setStreamingContent("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([
      { role: "assistant", content: INITIAL_MESSAGE, id: "initial" },
    ]);
    setInput("");
    setStreamingContent("");
    setHeadlinesContent("");
    setOutlineContent("");
    setVslContent("");
    setResearchSources([]);
    setActiveTab("research");
    setProjectId(null);
    router.replace("/builder");
  };

  const handleLoadProject = (draft: ProjectDraft) => {
    setMessages(draft.messages);
    setHeadlinesContent(draft.headlinesContent);
    setOutlineContent(draft.outlineContent);
    setVslContent(draft.vslContent);
    setResearchSources(draft.researchSources);
    setProjectId(draft.id);
    router.replace(`/builder?id=${draft.id}`, { scroll: false });
    setActiveTab(
      bestTab(
        draft.headlinesContent,
        draft.outlineContent,
        draft.vslContent,
        draft.researchSources
      )
    );
    setShowProjectsModal(false);
  };

  const handleAddResearch = async (url: string) => {
    setIsResearching(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        throw new Error((await res.text()) || "Research failed");
      }

      const data = await res.json();
      const source: ResearchSource = {
        id: Date.now().toString(),
        url: data.url,
        title: data.title || url,
        cards: data.cards || [],
      };
      setResearchSources((prev) => [...prev, source]);
      setActiveTab("research");
    } finally {
      setIsResearching(false);
    }
  };

  const hasAnyArtifact =
    headlinesContent.length > 0 ||
    outlineContent.length > 0 ||
    vslContent.length > 0;

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Left panel — Chat */}
      <div className="flex flex-col border-r border-gray-800" style={{ width: "44%" }}>
        {/* Header */}
        <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400 font-mono text-sm font-semibold">
              VSL BUILDER
            </span>
            <span className="text-gray-600 text-xs hidden sm:block">
              MTA Copy Intelligence
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProjectsModal(true)}
              className="text-gray-500 hover:text-gray-300 text-xs font-mono transition-colors"
            >
              PROJECTS
            </button>
            <button
              onClick={resetChat}
              className="text-gray-600 hover:text-gray-400 text-xs font-mono transition-colors"
            >
              NEW
            </button>
          </div>
        </header>

        {/* Stage progress bar */}
        {hasAnyArtifact && (
          <div className="border-b border-gray-800 px-4 py-2 flex items-center gap-3 flex-shrink-0">
            <span className="text-gray-700 text-xs font-mono">STAGE</span>
            {[
              {
                id: "headlines" as const,
                label: "1. Headlines",
                done: headlinesContent.includes("===== END HEADLINES ====="),
              },
              {
                id: "outline" as const,
                label: "2. Outline",
                done: outlineContent.includes("===== END OUTLINE ====="),
              },
              {
                id: "vsl" as const,
                label: "3. VSL",
                done: vslContent.includes("END OF SCRIPT"),
              },
            ].map((stage) => (
              <button
                key={stage.id}
                onClick={() => setActiveTab(stage.id)}
                className={`text-xs font-mono px-2 py-0.5 rounded transition-colors ${
                  stage.done
                    ? "text-green-400"
                    : stage.id === activeTab
                    ? "text-yellow-500"
                    : "text-gray-600"
                }`}
              >
                {stage.done ? "✓" : "○"} {stage.label}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {streamingContent && (
              <MessageBubble
                message={{
                  role: "assistant",
                  content: streamingContent,
                  id: "streaming",
                }}
                isStreaming
              />
            )}

            {isLoading && !streamingContent && (
              <div className="flex items-center gap-2 mr-8">
                <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-500">
                  <span className="animate-pulse">Thinking</span>
                  <span className="animate-ping ml-1">.</span>
                  <span className="animate-ping ml-0.5">.</span>
                  <span className="animate-ping ml-0.5">.</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-gray-800 px-4 py-4 flex-shrink-0">
          {!isLoading && messages.length <= 3 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                "Bryan Bottarelli / Ryan as host / PMK",
                "Nate Bear / solo / PSU front-end",
                "Karim Rahemtulla / Ryan / TPU back-end",
              ].map((hint) => (
                <button
                  key={hint}
                  onClick={() => setInput(hint)}
                  className="text-xs bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-400 px-3 py-1.5 rounded-full transition-colors"
                >
                  {hint}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isLoading
                  ? "Generating..."
                  : messages.length === 1
                  ? "Tell me about the presenter and whether there should be a host..."
                  : "Type your answer... (Enter to send, Shift+Enter for newline)"
              }
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-gray-900 border border-gray-700 focus:border-green-600 rounded-lg px-4 py-3 text-gray-200 text-sm placeholder-gray-600 resize-none outline-none transition-colors font-mono"
              style={{ minHeight: "48px", maxHeight: "200px" }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-green-700 hover:bg-green-600 disabled:bg-gray-800 disabled:text-gray-600 text-white px-4 py-3 rounded-lg transition-colors flex-shrink-0 font-mono text-sm"
            >
              {isLoading ? "..." : "SEND"}
            </button>
          </div>

          <p className="text-gray-700 text-xs mt-2 font-mono">
            After the interview: type{" "}
            <span className="text-green-700">HEADLINES</span> →{" "}
            <span className="text-green-700">OUTLINE</span> →{" "}
            <span className="text-green-700">VSL</span>
          </p>
        </div>
      </div>

      {/* Right panel — Artifacts */}
      <div style={{ width: "56%" }}>
        <ArtifactPanel
          headlinesContent={headlinesContent}
          outlineContent={outlineContent}
          vslContent={vslContent}
          researchSources={researchSources}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddResearch={handleAddResearch}
          isResearching={isResearching}
          isStreaming={isLoading}
        />
      </div>

      {/* Projects modal */}
      {showProjectsModal && (
        <ProjectsModal
          currentProjectId={projectId}
          onLoad={handleLoadProject}
          onClose={() => setShowProjectsModal(false)}
        />
      )}
    </div>
  );
}
