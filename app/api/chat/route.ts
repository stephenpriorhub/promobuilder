import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

const client = new Anthropic();

type MessageRole = "user" | "assistant";

interface Message {
  role: MessageRole;
  content: string;
}

function buildSystemPrompt(researchCards: unknown[]): string {
  if (!researchCards || researchCards.length === 0) return SYSTEM_PROMPT;
  const cardsText = researchCards
    .map((source: unknown) => {
      const s = source as { title?: string; url?: string; cards?: Array<{ type?: string; headline?: string; content?: string; copyUse?: string }> };
      const lines = [`SOURCE: ${s.title || "Untitled"} (${s.url || ""})`];
      if (s.cards) {
        for (const card of s.cards) {
          lines.push(`  [${(card.type || "fact").toUpperCase()}] ${card.headline}: ${card.content}${card.copyUse ? ` | Copy use: ${card.copyUse}` : ""}`);
        }
      }
      return lines.join("\n");
    })
    .join("\n\n");
  return (
    SYSTEM_PROMPT +
    `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRESEARCH CARDS (provided by copywriter)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${cardsText}\n\nDraw from these research cards when generating headlines, outlines, and copy.`
  );
}

export async function POST(req: Request) {
  try {
    const { messages, researchCards } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(researchCards || []);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const allMessages: Anthropic.MessageParam[] = messages.map(
          (m: Message) => ({
            role: m.role,
            content: m.content,
          })
        );

        // Anthropic API requires messages to start with 'user' role.
        // Strip any leading assistant messages (e.g. the UI's initial greeting).
        const firstUserIdx = allMessages.findIndex((m) => m.role === "user");
        const anthropicMessages = firstUserIdx > 0
          ? allMessages.slice(firstUserIdx)
          : allMessages;

        if (anthropicMessages.length === 0) {
          controller.close();
          return;
        }

        const response = await client.messages.create({
          model: "claude-opus-4-7",
          max_tokens: 16000,
          system: systemPrompt,
          messages: anthropicMessages,
          stream: true,
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = event.delta.text;
            controller.enqueue(encoder.encode(chunk));
          }

          if (event.type === "message_stop") {
            controller.close();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const message =
      error instanceof Error && error.message.includes("API key")
        ? "ANTHROPIC_API_KEY is missing or invalid. Add it to .env.local and restart the server."
        : "API error. Check server logs.";
    return new Response(message, { status: 500 });
  }
}
