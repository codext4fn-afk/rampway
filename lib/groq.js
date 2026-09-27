// Server-only helper. The Groq key is read from an environment variable here
// and never sent to the browser.
import "server-only";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

// An error whose message is safe and friendly to show to the user.
export class UserFacingError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

async function callGroq({ system, user, maxTokens, reasoningEffort }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.error("GROQ_API_KEY is not set");
    throw new UserFacingError("The AI service isn't configured yet. Please try again later.");
  }

  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        reasoning_effort: reasoningEffort,
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(50_000),
    });
  } catch (err) {
    console.error("Groq request failed:", err);
    throw new UserFacingError("We couldn't reach the AI service. Please try again in a moment.", 502);
  }

  if (res.status === 429) {
    throw new UserFacingError(
      "The AI service is busy right now (free-tier rate limit). Please wait about a minute and try again.",
      429
    );
  }
  if (!res.ok) {
    const detail = await res.text();
    console.error("Groq error", res.status, detail);
    // Groq returns 400 json_validate_failed when the model produced malformed JSON; worth a retry.
    return { retryable: res.status === 400 && detail.includes("json_validate_failed") };
  }

  const data = await res.json();
  try {
    return { json: JSON.parse(data.choices?.[0]?.message?.content ?? "") };
  } catch {
    console.error("Groq returned non-JSON content");
    return { retryable: true };
  }
}

// Ask the model for a JSON object. Retries once if the model's output was malformed.
export async function askGroqForJson({ system, user, maxTokens = 4000, reasoningEffort = "low" }) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { json, retryable } = await callGroq({ system, user, maxTokens, reasoningEffort });
    if (json) return json;
    if (!retryable) break;
  }
  throw new UserFacingError("The AI service had a problem producing an answer. Please try again.", 502);
}

// Wraps a POST handler so every failure becomes { error: "friendly message" } JSON.
export function jsonRoute(handler) {
  return async function POST(req) {
    try {
      let body;
      try {
        body = await req.json();
      } catch {
        throw new UserFacingError("The request was malformed. Please reload the page and try again.", 400);
      }
      return Response.json(await handler(body));
    } catch (err) {
      if (err instanceof UserFacingError) {
        return Response.json({ error: err.message }, { status: err.status });
      }
      console.error("Unexpected error:", err);
      return Response.json({ error: "Something went wrong on our side. Please try again." }, { status: 500 });
    }
  };
}

// Helpers for trusting nothing about the model's output shape.
export const str = (v) => (typeof v === "string" ? v.trim() : "");
export const arr = (v) => (Array.isArray(v) ? v : []);
