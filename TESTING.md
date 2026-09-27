# Testing, reliability and cost

Every number below was measured against the **live deployment** (https://rampway.vercel.app) on **27 September 2026**, using the scripts in [`tests/`](tests/). The scripts can be re-run by anyone, and unit and upload tests need no API key.

```bash
npm run test:unit                                      # offline: redaction + evidence tracing (13 checks)
npm run test:upload -- https://rampway.vercel.app      # 9 upload edge cases (no AI call)
npm run test:ai -- https://rampway.vercel.app 2        # end-to-end AI evaluation, 2 runs per example
```

## 1. Unit tests: 13/13 pass (`tests/unit.mjs`)

| Area | What's checked |
|---|---|
| Contact redaction (`lib/privacy.js`) | Removes emails, Moroccan mobiles (`+212 6…`, `06-…`), `00` international numbers and US numbers. **Keeps** date ranges (`2022-2025`), `Bac+3` and small counts, so CV content isn't damaged. |
| Evidence tracing (`lib/trace.js`) | Verifies real CV lines, including accent, bullet-symbol and small wording differences. **Rejects** invented results ("Reduced onboarding time by 30%"), invented tools ("Looker dashboards") and missing sources. |

## 2. Upload edge cases: 9/9 behave as expected (`tests/upload.mjs`)

| Input (in `tests/fixtures/`) | Result | Time |
|---|---|---|
| Text PDF CV | 200, 104 words extracted into the editable box | 983 ms |
| Word .docx CV | 200, 101 words | 567 ms |
| Scanned / image-only PDF | 422: "couldn't read text… probably a scanned image… paste your CV text" | 346 ms |
| Password-protected PDF | 422: "remove the password… or paste your CV text" | 557 ms |
| Password-protected Word file | 415: "old .doc or password-protected Word file… Save As .docx or PDF" | 331 ms |
| Old `.doc` format | 415: same guidance | 158 ms |
| Empty file | 422: "This file is empty… paste your CV text" | 163 ms |
| Text file renamed `.pdf` | 415: "We can only read PDF or Word (.docx) files" (checked by file contents, not extension) | 178 ms |
| 4.2 MB file | 413: "over 4 MB… export without images or paste the text" (the browser also blocks it before upload) | 2065 ms |

Files are processed in memory and never written to disk or stored.

## 3. End-to-end AI evaluation (`tests/ai-eval.mjs`, 2 runs × 2 examples + Bridge)

| Run | Time | Model | Bullets traced to CV | Contact details removed | Contact leak in output | Language | Flagged sentences |
|---|---|---|---|---|---|---|---|
| FR Casablanca #1 | 5.7 s | main | 5/5 | 1 email, 1 phone | none | French ✓ | 2* |
| EN Manchester #1 | 4.8 s | main | 5/5 | 1 email | none | English | 0 |
| FR Casablanca #2 | 6.1 s | main | 5/5 | 1 email, 1 phone | none | French ✓ | 0 |
| EN Manchester #2 | 4.3 s | **backup** | 5/5 | 1 email | none | English | 1 |
| Bridge, Casablanca, no vehicle | 2.0 s | **backup** | – | – | – | – | 5 options in MAD, no vehicle jobs |

\* **Being honest about the flags:** both FR flags are false positives from our keyword check. "contribuer à la satisfaction de vos clients" states what the candidate wants to do, not a claim about the past. The EN #2 flag is a **real overstatement from the backup model** ("…demonstrating my ability to… improve processes"). That's exactly why backup-model answers carry a "check this one extra carefully" note in the UI.

**Evidence tracing: 20/20 bullets were traced to a real CV line** across these runs. Bullets whose cited source can't be found in the CV are shown with a warning instead of the tick.

### How honesty improved during development
Measured with an earlier, stricter keyword script on the English example (4 runs each):

| Prompt version | Flagged sentences (4 runs) |
|---|---|
| v1: basic "don't invent" rule | **24**. Invented outcomes ("improving onboarding speed", "maintaining high satisfaction"), invented plans ("I plan to start online courses immediately") |
| v2: explicit bans on invented results, soft claims and plans; `[add result]` placeholders; self-check; medium reasoning | **8–9**, mostly harmless future-intent sentences |
| v3 (current): v2 plus quoting the CV source for each bullet, checked by the server | 3 in the run above (2 false positives, 1 real, from the backup model) |

## 4. Speed

| Request | Typical time (measured) |
|---|---|
| Tailor, main model (`gpt-oss-120b`, medium reasoning) | 4.8–6.4 s |
| Tailor, backup model | 4–10 s |
| Bridge income | 2–3 s |
| File extraction | 0.2–1 s |

The UI shows a staged progress panel with elapsed seconds during these waits.

## 5. Cost

Token use per request, from server logs: **tailor about 1,250–1,400 input + 1,800–3,300 output tokens.**

At Groq's published on-demand price for `gpt-oss-120b` (**$0.15 per 1M input tokens, $0.60 per 1M output tokens**, from [the model page](https://console.groq.com/docs/model/openai/gpt-oss-120b), checked 27 Sep 2026):

- **One tailored application ≈ $0.0002 input + $0.0015 output ≈ $0.0017**, so about **590 applications per US$1**.
- During the hackathon it runs on Groq's **free tier: $0**.

## 6. Failure modes and fallbacks

| Failure | What happens | Where |
|---|---|---|
| Main model rate-limited (free tier ≈ 8,000 tokens/min) | Automatic retry on `gpt-oss-20b`, then `qwen3.8-27b`. Each has its own quota. The UI notes when a backup answered. **Observed:** backups answered 2 of 5 requests in the burst above, and all 5 succeeded. | `lib/groq.js` |
| Model returns malformed JSON (Groq `json_validate_failed`) | Retried once, then next model | `lib/groq.js` |
| Model returns an **incomplete** answer (e.g. a cut-off cover letter). **Observed** with `qwen3.8-27b`, whose reasoning used up its token budget. | A completeness check rejects it, then retry, then next model. Qwen now runs with reasoning off. Incomplete answers are never shown. | `lib/groq.js`, `isComplete` in both routes |
| All models busy | Friendly message: "busy right now… wait about a minute" (HTTP 429) | `lib/groq.js` |
| Network error or timeout (50 s) | Friendly message, never a blank screen | `lib/groq.js`, `app/page.js` |
| Missing API key on the server | "The AI service isn't configured yet" | `lib/groq.js` |
| Bad input (empty, too short, over 20,000 characters, hours out of range) | Plain-English validation message | both routes |
| Unexpected render crash | Error boundary with a "Try again" button | `app/error.js` |
| Browser code importing the key-handling module | **Build fails** (`server-only`). Verified by adding such an import on purpose. | `lib/groq.js` |

## 7. Security checks

- `GROQ_API_KEY` exists only in `.env.local` (git-ignored) and in Vercel's environment settings.
- Full git history scanned for Groq, GitHub, OpenAI, Google key formats and private keys: **0 matches**. The only env file ever committed is `.env.example`, with an empty value.
- All JavaScript files served by the live site scanned for the key, `gsk_` and `GROQ_API_KEY`: **not found**.

## Not tested / known gaps

- **The summary and cover letter are not traced sentence by sentence.** Only experience bullets are checked against the CV. The backup model occasionally overstates in the summary.
- No load test beyond small bursts. Under sustained jury-scale traffic, all three free-tier quotas can run out, and users then see the "wait a minute" message.
- No OCR, so scanned CVs must be pasted.
- Bridge Income can name platforms that have changed or left a market (e.g. it once suggested Jumia Food in Morocco). The suggestions are reasoned, not live data, and the UI says so. Each one links to live job-site searches (checked on 27 Sep: a Rekrute link for "agent centre d'appels" opened current postings), but Rekrute's search isn't city-filtered and the individual adverts aren't vetted.
- Arabic-language job adverts were not tested.
