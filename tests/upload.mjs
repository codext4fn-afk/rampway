// Upload edge cases against a running app (local or live). No API key needed: /api/extract never calls the AI.
// Run: npm run test:upload -- https://rampway.vercel.app   (defaults to http://localhost:3000)
import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3000";
const fixture = (name) => new Blob([readFileSync(new URL(`./fixtures/${name}`, import.meta.url))]);

const cases = [
  ["cv.pdf", "text PDF", 200, "words"],
  ["cv.docx", "Word .docx", 200, "words"],
  ["scanned.pdf", "scanned / image-only PDF", 422, "scanned image"],
  ["locked.pdf", "password-protected PDF", 422, "password-protected"],
  ["locked.docx", "password-protected Word file", 415, "password-protected Word"],
  ["old.doc", "old .doc format", 415, "old .doc"],
  ["empty.pdf", "empty file", 422, "empty"],
  ["notes.pdf", "not really a PDF", 415, "only read PDF or Word"],
  ["big.pdf", "4.2 MB file (over our 4 MB limit)", 413, "over 4 MB"],
];

let failed = 0;
for (const [name, label, wantStatus, wantText] of cases) {
  const form = new FormData();
  const blob = name === "big.pdf" ? new Blob([new Uint8Array(4_200_000)]) : fixture(name);
  form.append("file", blob, name);
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/extract`, { method: "POST", body: form });
  const body = await res.json().catch(() => null);
  const text = body?.error || (body?.words ? `${body.words} words` : "");
  const ok = res.status === wantStatus && text.includes(wantText);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(36)} HTTP ${res.status}  ${Date.now() - t0}ms  ${text.slice(0, 70)}`);
}
console.log(failed ? `\n${failed} FAILED` : `\nAll ${cases.length} upload cases behaved as expected`);
process.exit(failed ? 1 : 0);
