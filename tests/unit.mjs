// Offline unit tests (no API key, no network): contact redaction and evidence tracing.
// Run: npm run test:unit
import { redactContact } from "../lib/privacy.js";
import { makeTracer } from "../lib/trace.js";

let failed = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      expected ${JSON.stringify(expected)}\n      got      ${JSON.stringify(actual)}`}`);
}

console.log("— redactContact: strips what the AI never needs, keeps everything else");
check("email", redactContact("jordan.lee@example.com | Manchester"), "[email removed] | Manchester");
check("Moroccan mobile (+212)", redactContact("Tel: +212 6 12 34 56 78"), "Tel: [phone removed]");
check("Moroccan mobile (06…)", redactContact("06-12-34-56-78"), "[phone removed]");
check("international 00 prefix", redactContact("00212612345678"), "[phone removed]");
check("US format with brackets", redactContact("(555) 123-4567"), "[phone removed]");
check("keeps date ranges", redactContact("BrightTel (2022-2025), 2020 - 2022"), "BrightTel (2022-2025), 2020 - 2022");
check("keeps small numbers", redactContact("Answered 60+ calls, Bac+3, Licence 2024"), "Answered 60+ calls, Bac+3, Licence 2024");

console.log("\n— makeTracer: bullets must cite a line that really exists in the CV");
const trace = makeTracer(`EXPÉRIENCE
- Traitement de 50 appels par jour en français et en arabe
- Saisie et suivi des réclamations clients dans le CRM
Customer Support Advisor - BrightTel (2022-2025)
• Trained 5 new starters on the call scripts and ticketing system`);
check("exact French line", trace("Traitement de 50 appels par jour en français et en arabe").verified, true);
check("accents/bullet differences tolerated", trace("traitement de 50 appels par jour en francais et en arabe").verified, true);
check("small wording slip tolerated, real line returned", trace("Trained 5 new starters on call scripts and the ticketing system"), {
  source: "Trained 5 new starters on the call scripts and ticketing system",
  verified: true,
});
check("invented result rejected", trace("Reduced onboarding time by 30% for new starters").verified, false);
check("invented tool rejected", trace("Built weekly Looker dashboards for the operations team").verified, false);
check("missing source rejected", trace("").verified, false);

console.log(failed ? `\n${failed} FAILED` : "\nAll unit tests passed");
process.exit(failed ? 1 : 0);
