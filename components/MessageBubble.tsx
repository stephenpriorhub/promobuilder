"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user";
  const isVSL =
    message.content.includes("===== VSL:") ||
    message.content.includes("VIDEO SCRIPT BEGINS");
  const isHeadlines = message.content.includes("===== HEADLINES & LEAD:");
  const isOutline = message.content.includes("===== OUTLINE:");
  const isArtifact = isVSL || isHeadlines || isOutline;

  const artifactLabel = isVSL
    ? "▶ Full VSL Script"
    : isHeadlines
    ? "▶ Headlines & Lead — Stage 1"
    : "▶ Outline — Stage 2";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="chat-message-user max-w-2xl">
          <p className="text-gray-200 text-sm whitespace-pre-wrap font-mono">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div
        className={`${
          isArtifact
            ? "bg-gray-950 border border-green-900 w-full"
            : "chat-message-assistant max-w-3xl"
        } ${isStreaming ? "cursor-blink" : ""}`}
      >
        {isArtifact && (
          <div className="border-b border-green-900 px-4 py-2 mb-4 flex items-center justify-between">
            <span className="text-green-500 text-xs font-mono uppercase tracking-widest">
              {artifactLabel}
            </span>
            <span className="text-gray-600 text-xs font-mono">
              See tab →
            </span>
          </div>
        )}
        <div className={`${isArtifact ? "px-4 pb-4" : ""} prose-vsl`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p className="text-gray-300 text-sm leading-relaxed mb-3 font-mono">
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong className="text-green-300 font-semibold">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="text-yellow-300 italic">{children}</em>
              ),
              h1: ({ children }) => (
                <h1 className="text-xl font-bold text-green-400 mt-6 mb-3 font-mono">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-bold text-green-300 mt-5 mb-2 font-mono">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-green-200 mt-4 mb-2 font-mono">
                  {children}
                </h3>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-3 space-y-1 text-sm text-gray-300 font-mono">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-3 space-y-1 text-sm text-gray-300 font-mono">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-gray-300">{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-green-700 pl-4 my-3 text-gray-400 italic text-sm font-mono">
                  {children}
                </blockquote>
              ),
              hr: () => (
                <hr className="border-gray-800 my-4" />
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <code className="block bg-gray-950 border border-gray-800 rounded p-3 text-xs text-green-400 font-mono my-3 whitespace-pre-wrap">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="bg-gray-800 text-green-400 px-1 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="overflow-x-auto">{children}</pre>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
