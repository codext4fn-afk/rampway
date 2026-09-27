// Phase 1 sanity check: one tiny call to Groq using the key in .env.local.
const key = process.env.GROQ_API_KEY;
if (!key) {
  console.error("No GROQ_API_KEY found. Put it in .env.local.");
  process.exit(1);
}
const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: "Reply with exactly: RampWay key works" }],
    max_tokens: 20,
  }),
});
if (!res.ok) {
  console.error(`Groq returned ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const data = await res.json();
console.log("SUCCESS:", data.choices[0].message.content);
