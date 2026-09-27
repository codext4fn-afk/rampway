# RampWay

**Get the job. Cover the gap.** An AI assistant that tailors your CV to a specific job, and suggests short-term income you could start this week while you search.

**Live app:** https://rampway.vercel.app. No sign-up is needed, and nothing you enter is saved.
**Try it in 20 seconds:** click **Try an example** (a French CV and job advert from Casablanca), then **Tailor my application**. Then open **02 Bridge income** and click **Try an example**, then **Find bridge income**.
**Evidence:** [TESTING.md](TESTING.md) has measured speed, cost, failure modes and honesty results.

---

## The problem

Job-seekers, especially people early in their careers, changing careers or returning to work, face two problems at once:

1. **Every application needs tailoring.** Recruiters and applicant-tracking systems look for evidence that matches *this* job. Rewriting a CV, spotting what's missing, writing a cover letter and preparing for interview takes hours per application, so people send the same generic CV everywhere and get filtered out.
2. **Job searches take time, and bills don't wait.** Many people need income *now* but don't know what short-term work realistically fits their skills, location and situation.

Existing tools tend to handle one of these, sit behind accounts or paywalls, work only in English, or cheerfully invent experience you don't have.

**Who it's for (our design user):** a recent graduate in Casablanca with a six-month customer-service internship. She applies to jobs advertised in French and needs income while she searches. Generic AI tools answer her in English, pad her CV with results she never achieved, and send her phone number and email to a third-party AI provider.

## The solution

RampWay is a single-page web app with two tools that share one profile (your CV):

1. **Tailor my CV.** Upload or paste your CV, paste a job advert, and get a tailored application in seconds.
2. **Bridge income.** Enter your skills, city, free hours and whether you have a vehicle, and get 3–5 realistic short-term options, each with a concrete first step.

It is built around honesty. It rephrases and emphasises what's really in your CV, and when a claim would need evidence you haven't given, it leaves a `[placeholder]` for you to fill in rather than inventing one. **Every rewritten bullet cites the CV line it came from, and the server checks that citation against your actual CV.**

## Features

### 1. CV tailoring (core)
- **Upload a PDF or Word (.docx) CV, or paste the text.** The extracted text appears in an editable box so you can fix any parsing problems before submitting.
- Clear, specific messages for files that can't be read: scanned/image-only PDFs, password-protected PDFs or Word files, old `.doc` files, empty files, files over 4 MB and the wrong file type. Each one tells you what to do next.
- **Answers in the job advert's language:** a French advert gets a French CV, cover letter ("Madame, Monsieur,") and interview questions.
- **Privacy by design:** email addresses and phone numbers are removed on the server *before* anything is sent to the AI, and the results say what was removed.
- Results in four clearly separated sections, each with a copy button (plus **Copy all**):
  - **A. Tailored CV:** summary and experience bullets rewritten for the job. **Each bullet shows "From your CV: …"** with the original line, verified by the server (`lib/trace.js`), plus a count like "5 of 5 bullets traced to your CV". Bullets whose source can't be found are flagged.
  - **B. Skills gap:** what the job asks for that the CV doesn't show, with one honest next step each
  - **C. Cover letter:** a first draft of about 200 words
  - **D. Interview prep:** 5 likely questions for this role, each with a tip based on your real experience
- A sticky jump bar for moving between sections, and a **Try an example** button for a quick demo.

### 2. Bridge income (secondary)
- Takes skills (and optionally the CV from tab 1), city, hours per week and vehicle yes/no.
- Returns 3–5 options that fit, each with why it fits, pay guidance, **one concrete "how to start" step** and one honest caveat.
- No driving work is suggested if you don't have a vehicle. Scams, MLM schemes and anything with upfront fees are excluded.

### Experience
- Editorial "paper & signal" design (Fraunces, IBM Plex Sans and IBM Plex Mono), with light and dark mode.
- Animated hero illustration, staggered results, and a staged loading state that explains what's happening instead of a bare spinner.
- A "See it in action" band with a real 44-second screen recording of the app (`public/demo.mp4`). It was produced by an automated Playwright script and shows a PDF upload, a French tailored application with traced bullets, and Bridge income for Casablanca.
- Bridge income is signposted three ways: a header button, a pulsing "Need money now?" badge on its tab, and a "Need income this week?" card after the CV results.
- Works on phones (tested at 390px wide). Respects the "reduce motion" accessibility setting.
- Friendly error messages everywhere. There's never a blank screen or raw error; a crash screen catches anything unexpected.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router), React 19, plain JavaScript and CSS |
| Hosting | [Vercel](https://vercel.com) (free Hobby tier) |
| LLM | [Groq](https://groq.com) API, free tier: `openai/gpt-oss-120b` (main), with `openai/gpt-oss-20b` then `qwen/qwen3.8-27b` as rate-limit fallbacks |
| Testing | Node scripts in `tests/`: unit, upload edge cases, end-to-end AI evaluation (see [TESTING.md](TESTING.md)) |
| File parsing | [`unpdf`](https://github.com/unjs/unpdf) (PDF) and [`mammoth`](https://github.com/mwilliamson/mammoth.js) (DOCX), both in memory |
| Storage | None: no database, no accounts, no file storage |

### How it fits together

```
Browser (app/page.js)
   │  CV text / file, job advert, bridge inputs
   ▼
Next.js API routes on Vercel (server-side only)
   ├── /api/extract  → reads PDF/DOCX in memory, returns text, discards the file
   ├── /api/tailor   → removes contact details → calls Groq → checks completeness
   │                    → verifies each bullet's cited CV line (lib/trace.js) → JSON
   └── /api/bridge   → removes contact details → calls Groq → 3–5 options as JSON
            │
            ▼
      lib/privacy.js → strips emails and phone numbers before any AI call
      lib/groq.js    → the only code that reads GROQ_API_KEY; retries malformed or
                       incomplete output, falls back gpt-oss-120b → gpt-oss-20b →
                       qwen3.8-27b on rate limits, turns every failure into a friendly message
```

**The API key never reaches the browser.** It is read from a server-side environment variable in `lib/groq.js` (which imports `server-only`, so the build fails if browser code ever imports it). The key isn't in this repo: `.env.local` is git-ignored, and only `.env.example` with an empty value is committed.

## Run it locally

You need [Node.js](https://nodejs.org) 20.9 or newer and a free Groq API key.

1. **Clone and install**
   ```bash
   git clone https://github.com/codext4fn-afk/rampway.git
   cd rampway
   npm install
   ```
2. **Add your key.** Create a key at https://console.groq.com/keys, then:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and paste your key after `GROQ_API_KEY=`.
3. **Check the key works** (makes one tiny API call):
   ```bash
   npm run test-key
   ```
4. **Start the app**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.
5. **Run the tests** (see [TESTING.md](TESTING.md))
   ```bash
   npm run test:unit
   npm run test:upload
   npm run test:ai
   ```

**Deploying your own copy:** import the repo in Vercel and add `GROQ_API_KEY` under *Project → Settings → Environment Variables*. No other configuration is needed.

## AI / model disclosure

- **Models:** RampWay uses OpenAI's open-weight **gpt-oss-120b**, served by **Groq**. If that model is rate-limited, the request goes to **gpt-oss-20b**, then **qwen3.8-27b**. Answers from a backup model show a note asking you to check them extra carefully.
- **Where your data goes:** email addresses and phone numbers are removed first. The rest of the CV text, the job advert and the bridge-income inputs you submit are then sent to Groq's API to generate the response. **RampWay stores nothing:** there is no database, no accounts and no logging of your content, and uploaded files are processed in memory and discarded. Groq's own data handling is covered by [Groq's privacy policy](https://groq.com/privacy-policy/). Don't submit anything you aren't comfortable sending to a third-party AI provider.
- **All output is AI-generated.** Nothing is checked by a human. Bridge-income suggestions are reasoned ideas, **not live job listings**.
- **Built with AI assistance:** this project was built during a hackathon with the help of an AI coding assistant (Claude).

## Responsible AI

This is shown in the app as well as here: under each submit button, and again above the results.

- **Privacy:** your CV text is sent to the LLM provider (Groq) for processing and is **not stored by us**. Emails and phone numbers are removed before sending.
- **AI hiring advice can be biased or wrong.** Always review the output yourself before sending anything to an employer.

What the app does about these risks:

| Risk | What RampWay does |
|---|---|
| **Fabricated experience.** AI "helpfully" invents skills, results or metrics, which could cost someone a job or worse. | The prompt forbids inventing experience, results, soft claims, skill upgrades, courses or plans. Every bullet must rephrase a real CV line. Missing results become `[add result]` placeholders, and missing skills go to the skills-gap list instead of the CV. The model runs a self-check pass before answering. **Then the server checks it:** each bullet must quote its source CV line, which `lib/trace.js` verifies against the real CV, flagging anything it can't find (20/20 traced in the live evaluation). Unsupported claims fell from **24 flagged sentences in 4 runs to 3**. See [TESTING.md](TESTING.md). |
| **Unnecessary personal data sent to a third party.** | Emails and phone numbers are removed server-side before any AI call (`lib/privacy.js`, unit-tested). The UI shows what was removed. |
| **Bias.** The model could infer or act on protected characteristics. | The prompts tell the model never to infer or mention age, gender, ethnicity, religion, disability, nationality or family status, or let them influence advice. |
| **Prompt injection.** A CV or job advert could contain hidden instructions. | User content is wrapped in tags and the model is told to treat it strictly as data. |
| **Out-of-date facts.** In testing, the model estimated pay *below* the legal minimum wage. | Bridge income never quotes hourly rates for employed roles. It says "at least the local minimum wage, check the advert", and only gives clearly labelled rough ranges for gig or freelance work. |
| **Harmful suggestions.** | Bridge income excludes scams, MLM schemes and anything with upfront fees, and every result reminds users never to pay to start work. |
| **Over-trust.** | Every result starts with "Review before you send". Skills-gap actions are honest ("keen to learn"), and backup-model answers are flagged. |

## Known limitations

- **The AI can still make mistakes.** The honesty rules greatly reduce invented claims but can't eliminate them, and the backup model follows them less reliably. Always review.
- **Free-tier rate limits.** Groq's free tier allows about 8,000 tokens per minute per model, and one tailoring request uses about 3,000. Under heavy use, all three models can be busy at once, and users see a friendly "wait a minute" message.
- **No OCR.** Scanned or photographed CVs can't be read. Users are asked to paste the text instead.
- **4 MB upload limit**, because Vercel caps request bodies at 4.5 MB. Old `.doc` files aren't supported.
- **Parsing is text-only.** Complex layouts (columns, tables, text boxes) can come out in a jumbled order, which is why the extracted text is always shown for editing.
- **Bridge income is reasoning, not data.** The model may name companies or platforms that don't operate in your area or that have fees. Check each one yourself.
- **The loading stages are illustrative.** The API returns the whole answer at once, so the progress steps advance on a timer rather than reporting real progress.
- **Evidence tracing covers experience bullets only.** The summary and cover letter are not traced sentence by sentence.
- **Tested in French and English.** Arabic job adverts have not been tested, and advice may lean towards UK, US and French-language hiring norms.

## Next steps

- **Stream responses** so sections appear as they're written, making the progress display real.
- **Trace every sentence:** extend evidence tracing from bullets to the summary and cover letter.
- **OCR** for scanned CVs (e.g. Tesseract), still processed in memory.
- **Download as .docx/PDF** in a clean CV template.
- **Live opportunities:** optionally connect bridge income to real job-board and gig APIs for the user's city.
- **Mock interview mode:** RampWay asks you the five likely questions and gives feedback on your answers.
- **Evaluation set:** a set of real, anonymised CV/job pairs, scored automatically for fabrication and bias on every change.
- **Rate-limit resilience:** a paid tier or a queue, so busy periods never block users.

## Project structure

```
app/
  page.js              UI: both tools, upload, results, loading and empty states
  layout.js            fonts and metadata
  globals.css          design system and animations
  error.js             crash screen (never a blank page)
  icon.svg             favicon
  api/tailor/route.js  CV tailoring endpoint and prompt
  api/bridge/route.js  bridge income endpoint and prompt
  api/extract/route.js PDF/DOCX text extraction (in memory)
lib/groq.js            server-only Groq client: key handling, retries, completeness checks, fallbacks, friendly errors
lib/privacy.js         removes emails and phone numbers before any AI call
lib/trace.js           verifies each bullet's cited source against the CV
tests/                 unit, upload and AI evaluation scripts + fixtures (see TESTING.md)
scripts/test-key.mjs   one-call check that your API key works
```
