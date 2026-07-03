"use client";

import { useState, useEffect } from "react";
import {
  listProjects,
  deleteProject,
  renameProject,
  ProjectDraft,
} from "@/lib/storage";

interface Props {
  currentProjectId: string | null;
  onLoad: (project: ProjectDraft) => void;
  onClose: () => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function progressLabel(p: ProjectDraft): { label: string; color: string } {
  if (p.vslContent) return { label: "VSL", color: "text-green-400" };
  if (p.outlineContent) return { label: "Outline", color: "text-yellow-500" };
  if (p.headlinesContent) return { label: "Headlines", color: "text-blue-400" };
  return { label: "Interview", color: "text-gray-500" };
}

export default function ProjectsModal({ currentProjectId, onLoad, onClose }: Props) {
  const [projects, setProjects] = useState<ProjectDraft[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const refresh = async () => setProjects(await listProjects());

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    await refresh();
  };

  const startRename = (p: ProjectDraft) => {
    setRenamingId(p.id);
    setRenameValue(p.name);
  };

  const commitRename = async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    await renameProject(renamingId, renameValue.trim());
    setRenamingId(null);
    await refresh();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-xl mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <span className="text-green-400 font-mono text-sm font-semibold uppercase tracking-wide">
            Saved Projects
          </span>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-300 text-xs font-mono transition-colors"
          >
            CLOSE
          </button>
        </div>

        {/* Project list */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-800">
          {projects.length === 0 && (
            <div className="px-5 py-10 text-center text-gray-600 text-sm font-mono">
              No saved projects yet.
              <br />
              Start an interview and your work saves automatically.
            </div>
          )}

          {projects.map((p) => {
            const isCurrent = p.id === currentProjectId;
            const progress = progressLabel(p);
            const isRenaming = renamingId === p.id;
            const userMsgCount = p.messages.filter((m) => m.role === "user").length;

            return (
              <div
                key={p.id}
                className={`px-5 py-4 flex items-center gap-3 ${
                  isCurrent ? "bg-gray-800/50" : "hover:bg-gray-800/30"
                } transition-colors`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    isCurrent ? "bg-green-500" : "bg-gray-700"
                  }`}
                />

                <div className="flex-1 min-w-0">
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="bg-gray-800 border border-green-600 rounded px-2 py-0.5 text-gray-200 text-sm font-mono w-full outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => startRename(p)}
                      className="text-gray-200 text-sm font-mono text-left hover:text-white transition-colors truncate w-full block"
                      title="Click to rename"
                    >
                      {p.name}
                    </button>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-mono ${progress.color}`}>
                      {progress.label}
                    </span>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-gray-600 text-xs font-mono">
                      {relativeTime(p.updatedAt)}
                    </span>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-gray-600 text-xs font-mono">
                      {userMsgCount} {userMsgCount === 1 ? "msg" : "msgs"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isCurrent ? (
                    <span className="text-green-700 text-xs font-mono">CURRENT</span>
                  ) : (
                    <button
                      onClick={() => onLoad(p)}
                      className="text-xs font-mono px-3 py-1.5 rounded border border-gray-700 hover:border-green-600 hover:text-green-400 text-gray-400 transition-colors"
                    >
                      OPEN
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs font-mono px-2 py-1.5 rounded border border-gray-800 hover:border-red-700 hover:text-red-400 text-gray-600 transition-colors"
                  >
                    DEL
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-800 flex-shrink-0">
          <p className="text-gray-700 text-xs font-mono">
            {projects.length} project{projects.length !== 1 ? "s" : ""} saved locally
            {projects.length > 0 && " · click a name to rename"}
          </p>
        </div>
      </div>
    </div>
  );
}
