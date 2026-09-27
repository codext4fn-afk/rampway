// Server-only helper. The Groq key is read from an environment variable here
// and never sent to the browser.
import "server-only";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
// Backup models, each with its own free-tier quota, tried in order only when the one before is rate-limited.
const FALLBACK_MODELS = [
  process.env.GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b",
  process.env.GROQ_FALLBACK_MODEL_2 || "qwen/qwen3.8-27b",
];

// Contact details the AI never needs. Removing them before any AI call means they are never sent to
// the provider. Phone-like runs need 9+ digits so date ranges such as "2022-2025" are left alone.
export function redactContact(text) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/(?:\+|\b00|\()?\d[\d\s().-]{7,}\d/g, (m) => (m.replace(/\D/g, "").length >= 9 ? "[phone removed]" : m));
}

// An error whose message is safe and friendly to show to the user.
export class UserFacingError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

async function callGroq({ model, system, user, maxTokens, reasoningEffort }) {
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
        model,
        // Qwen spends its whole token budget "thinking" and truncates the answer, so it answers directly.
        reasoning_effort: model.startsWith("qwen/") ? "none" : reasoningEffort,
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
    console.warn(`Groq rate limit hit on ${model}`);
    return { rateLimited: true };
  }
  if (!res.ok) {
    const detail = await res.text();
    console.error("Groq error", res.status, detail);
    // Groq returns 400 json_validate_failed when the model produced malformed JSON; worth a retry.
    return { retryable: res.status === 400 && detail.includes("json_validate_failed") };
  }

  const data = await res.json();
  console.log(`Groq ${model}: ${data.usage?.prompt_tokens} in / ${data.usage?.completion_tokens} out`);
  try {
    return { json: JSON.parse(data.choices?.[0]?.message?.content ?? "") };
  } catch {
    console.error("Groq returned non-JSON content");
    return { retryable: true };
  }
}

// Ask the model for a JSON object. Retries once if the output was malformed or incomplete
// (per `isComplete`), and moves on to the backup models (separate quotas) if a model is
// rate-limited or keeps returning incomplete answers. An incomplete answer is never returned.
export async function askGroqForJson({ system, user, maxTokens = 4000, reasoningEffort = "low", isComplete = () => true }) {
  let rateLimited = false;
  for (const model of [...new Set([MODEL, ...FALLBACK_MODELS])]) {
    rateLimited = false;
    let incomplete = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await callGroq({ model, system, user, maxTokens, reasoningEffort });
      if (r.json && isComplete(r.json)) {
        // _usedBackup lets the UI tell the user a less capable model answered.
        return { ...r.json, _usedBackup: model !== MODEL };
      }
      if (r.json) {
        console.warn(`Groq ${model} returned an incomplete answer`);
        incomplete = true;
        continue;
      }
      if (r.rateLimited) {
        rateLimited = true;
        break;
      }
      if (!r.retryable) break;
    }
    // A hard error (e.g. a bad request) won't be fixed by switching models.
    if (!rateLimited && !incomplete) break;
  }
  if (rateLimited) {
    throw new UserFacingError(
      "The AI service is busy right now (free-tier rate limit). Please wait about a minute and try again.",
      429
    );
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
