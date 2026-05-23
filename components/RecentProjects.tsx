"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listProjects, ProjectDraft } from "@/lib/storage";

function progressLabel(p: ProjectDraft): string {
  if (p.vslContent) return "VSL";
  if (p.outlineContent) return "Outline";
  if (p.headlinesContent) return "Headlines";
  return "Interview";
}

function progressColor(p: ProjectDraft): string {
  if (p.vslContent) return "text-green-500";
  if (p.outlineContent) return "text-yellow-500";
  if (p.headlinesContent) return "text-blue-400";
  return "text-gray-600";
}

export default function RecentProjects() {
  const [projects, setProjects] = useState<ProjectDraft[]>([]);

  useEffect(() => {
    setProjects(listProjects().slice(0, 5));
  }, []);

  if (projects.length === 0) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-left">
      <h2 className="text-green-400 font-semibold text-sm uppercase tracking-wide mb-4">
        Recent Projects
      </h2>
      <div className="space-y-1">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/builder?id=${p.id}`}
            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-700 group-hover:bg-green-500 transition-colors flex-shrink-0" />
              <span className="text-gray-300 text-sm font-mono truncate">
                {p.name}
              </span>
              <span className={`text-xs font-mono flex-shrink-0 ${progressColor(p)}`}>
                {progressLabel(p)}
              </span>
            </div>
            <span className="text-gray-600 text-xs font-mono flex-shrink-0 ml-3">
              {new Date(p.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-800">
        <Link
          href="/builder"
          className="text-xs font-mono text-gray-600 hover:text-green-500 transition-colors"
        >
          + New project
        </Link>
      </div>
    </div>
  );
}
