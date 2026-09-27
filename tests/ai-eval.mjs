// End-to-end AI evaluation against a running app (uses the app's Groq key on the server side).
// Checks, per run: latency, which model answered, evidence tracing, contact-detail leaks,
// output language, and sentences that make claims NOT supported by the example CVs.
// Run: npm run test:ai -- https://rampway.vercel.app 2      (base URL, runs per example)
// Note: the free tier allows ~8k tokens/min per model, so several runs will exercise the fallbacks.
import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3000";
const RUNS = Number(process.argv[3] || 1);
const src = readFileSync(new URL("../app/page.js", import.meta.url), "utf8");
const grab = (n) => {
  const s = src.indexOf("`", src.indexOf(`const ${n} =`)) + 1;
  return src.slice(s, src.indexOf("`", s));
};

// Outcomes, skill upgrades and plans that neither example CV states. Forward-looking sentences
// ("keen to learn", "look forward") are excluded because they're not claims about the past.
const RED_FLAGS = [
  /reduc|improv|increas|satisfaction|efficien|faster|streamlin/i,
  /already|enrol|(have|am) (begun|started|taking|completing)/i,
  /\bpivot|xlookup|vlookup|tcd\b|tableaux crois|recherchev/i,
  /analy[sz]ed|analys[ée]|collaborat|metrics|dashboard/i,
];
const FORWARD = /eager|keen|willing|look forward|motivat|désireu|souhait|apprendre|learn|hâte|develop my|développer mes|expand|deepen|approfondir/i;

const examples = [
  { name: "FR Casablanca", cv: grab("EXAMPLE_CV_FR"), job: grab("EXAMPLE_JOB_FR"), contact: /612|yasmine\.elidrissi/i, french: true },
  { name: "EN Manchester", cv: grab("EXAMPLE_CV"), job: grab("EXAMPLE_JOB"), contact: /jordan\.lee@/i, french: false },
];

const rows = [];
for (let i = 1; i <= RUNS; i++) {
  for (const ex of examples) {
    const t0 = Date.now();
    const res = await fetch(`${BASE}/api/tailor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cv: ex.cv, job: ex.job }),
    });
    const d = await res.json();
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (d.error) {
      rows.push({ run: `${ex.name} #${i}`, secs, result: `ERROR (${res.status}): ${d.error}` });
      continue;
    }
    const bullets = d.tailoredExperience.flatMap((e) => e.bullets);
    const claims = [d.tailoredSummary, ...bullets.map((b) => b.text), ...d.coverLetter.split(/(?<=[.!?])\s+/)];
    const flagged = claims.filter((s) => !FORWARD.test(s) && RED_FLAGS.some((re) => re.test(s)));
    rows.push({
      run: `${ex.name} #${i}`,
      secs,
      model: d.usedBackup ? "backup" : "main",
      traced: `${bullets.filter((b) => b.verified).length}/${bullets.length}`,
      removed: `${d.removed?.emails ?? 0} email, ${d.removed?.phones ?? 0} phone`,
      contactLeak: ex.contact.test(JSON.stringify(d)) ? "LEAK" : "none",
      language: ex.french ? (/Madame|Monsieur/.test(d.coverLetter) ? "French ✓" : "NOT French") : "English",
      flagged: flagged.length,
    });
    flagged.forEach((s) => console.log(`  flagged in ${ex.name} #${i}: ${s.trim()}`));
  }
}

const t0 = Date.now();
const b = await (
  await fetch(`${BASE}/api/bridge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skills: "Customer service, French, Arabic, English, Excel", city: "Casablanca", hours: 20, hasVehicle: false }),
  })
).json();
const noVehicleOk = !b.error && !b.options.some((o) => /\b(car|van|motorbike|scooter|driver)\b/i.test(`${o.title} ${o.howToStart}`));
rows.push({
  run: "Bridge Casablanca",
  secs: ((Date.now() - t0) / 1000).toFixed(1),
  model: b.error ? "-" : b.usedBackup ? "backup" : "main",
  result: b.error ? `ERROR: ${b.error}` : `${b.options.length} options, MAD: ${/MAD|dirham/i.test(JSON.stringify(b))}, no-vehicle respected: ${noVehicleOk}`,
});

console.table(rows);
