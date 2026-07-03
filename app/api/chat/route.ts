import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, type ChatMessage } from "@/lib/build-prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { messages, researchCards } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 });
    }

    // Compose the full system prompt: stable scaffold + live brain intelligence
    // (per detected guru/service) + top comparable promos + research cards.
    const systemPrompt = await buildSystemPrompt(
      messages as ChatMessage[],
      researchCards || []
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const allMessages: Anthropic.MessageParam[] = messages.map(
          (m: ChatMessage) => ({
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
          model: "claude-opus-4-8",
          max_tokens: 32000, // full Stage-3 VSL (9–12k words) must not truncate
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
