// Evidence tracing: the model must cite the CV line behind each rewritten bullet, and we check that
// citation against the real CV text here, deterministically. Verified bullets show the CV's own line;
// anything we can't find is flagged in the UI for the user to check.
const norm = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents, so "é" matches "e"
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const stripBullet = (line) => line.replace(/^[\s\-–•*·]+/, "").trim();

export function makeTracer(cv) {
  const lines = cv
    .split("\n")
    .map(stripBullet)
    .filter((l) => norm(l).length > 3);
  return function trace(source) {
    const ns = norm(source);
    if (!ns) return { source: "", verified: false };
    const words = ns.split(" ").filter((w) => w.length > 2);
    let best = "";
    let bestScore = 0;
    for (const line of lines) {
      const nl = norm(line);
      if (nl.includes(ns) || (nl.length > 15 && ns.includes(nl))) return { source: line, verified: true };
      const lineWords = new Set(nl.split(" "));
      const score = words.length ? words.filter((w) => lineWords.has(w)).length / words.length : 0;
      if (score > bestScore) [best, bestScore] = [line, score];
    }
    // Near-exact quotes (small wording slips) still count, but we show the CV's real line.
    return bestScore >= 0.75 ? { source: best, verified: true } : { source: stripBullet(source), verified: false };
  };
}
