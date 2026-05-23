import Link from "next/link";
import RecentProjects from "@/components/RecentProjects";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo/Header */}
        <div>
          <div className="text-green-500 text-sm font-mono tracking-widest uppercase mb-4">
            Monument Traders Alliance
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            VSL Builder
          </h1>
          <p className="text-gray-400 text-lg">
            AI-powered copy intelligence for winning Video Sales Letters
          </p>
        </div>

        {/* Feature List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-left space-y-4">
          <h2 className="text-green-400 font-semibold text-sm uppercase tracking-wide mb-4">
            What this tool does
          </h2>
          <div className="space-y-3">
            {[
              {
                icon: "●",
                text: "Interviews you like a senior copy director — asking the right questions in the right order",
              },
              {
                icon: "●",
                text: "Embeds the 16-Word Sales Letter and Copy-Boarding frameworks into every prompt",
              },
              {
                icon: "●",
                text: "Knows every MTA promo: what worked, what didn't, and exactly why",
              },
              {
                icon: "●",
                text: "Generates a complete 9,000–12,000 word VSL script ready for production",
              },
              {
                icon: "●",
                text: "Flags gain claims and tells you exactly how to frame each one compliantly",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 text-gray-300 text-sm">
                <span className="text-green-500 mt-0.5 flex-shrink-0">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 text-left">
          <h2 className="text-green-400 font-semibold text-sm uppercase tracking-wide mb-4">
            How it works
          </h2>
          <div className="space-y-3">
            {[
              { step: "01", text: "Answer 7 areas of questions from your copy director" },
              { step: "02", text: "Type HEADLINES → get 3 headline options and an opening lead" },
              { step: "03", text: "Type OUTLINE → review the full section-by-section structure" },
              { step: "04", text: "Type VSL → generate the complete 9,000–12,000 word script" },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 text-sm">
                <span className="text-green-600 font-mono w-6 flex-shrink-0">{item.step}</span>
                <span className="text-gray-300">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent projects */}
        <RecentProjects />

        {/* Setup note */}
        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4 text-left">
          <p className="text-yellow-400 text-xs font-mono font-semibold uppercase tracking-wide mb-2">
            ⚠ First-time setup
          </p>
          <p className="text-yellow-200 text-sm font-mono">
            Add your Anthropic API key to{" "}
            <code className="text-yellow-400">.env.local</code> before
            starting:
          </p>
          <code className="block bg-black/40 text-yellow-300 text-xs mt-2 p-2 rounded">
            ANTHROPIC_API_KEY=sk-ant-your-key-here
          </code>
          <p className="text-yellow-600 text-xs mt-2">
            Get a key at console.anthropic.com → Settings → API Keys
          </p>
        </div>

        {/* CTA */}
        <div>
          <Link
            href="/builder"
            className="inline-block bg-green-600 hover:bg-green-500 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-lg"
          >
            Start Building Your VSL →
          </Link>
        </div>

        {/* Footer note */}
        <div className="text-gray-700 text-xs">
          Internal tool — MTA Copy Intelligence System
        </div>
      </div>
    </main>
  );
}
