import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic();

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response("Missing url", { status: 400 });
    }

    let pageText = "";
    let pageTitle = url;

    try {
      const fetchRes = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!fetchRes.ok) {
        return new Response(`Failed to fetch URL: ${fetchRes.status}`, {
          status: 422,
        });
      }

      const html = await fetchRes.text();

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) pageTitle = titleMatch[1].trim();

      pageText = stripHtml(html).slice(0, 10000);
    } catch {
      return new Response("Could not fetch that URL — it may block bots.", {
        status: 422,
      });
    }

    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are helping a financial copywriter research content for a VSL (Video Sales Letter). Extract the most useful copywriting research from this web page.

URL: ${url}
PAGE TITLE: ${pageTitle}

PAGE CONTENT:
${pageText}

Extract 3–6 index cards. Each card captures ONE useful piece of information: a compelling statistic, a key fact, a quotable claim, or a strong copy angle.

Return ONLY valid JSON in this exact format (no other text):
{
  "title": "Brief descriptive title for this source",
  "cards": [
    {
      "type": "stat",
      "headline": "Short title for this card (max 8 words)",
      "content": "The actual data or claim, 1–3 sentences. Include exact numbers and quotes where present.",
      "copyUse": "One sentence on how a VSL copywriter could use this."
    }
  ]
}

type must be one of: "stat", "fact", "quote", "angle"`,
        },
      ],
    });

    const responseText =
      msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response("Failed to parse research response", { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json({ url, ...parsed });
  } catch (error) {
    console.error("Research API error:", error);
    return new Response("Research failed. Check server logs.", { status: 500 });
  }
}
