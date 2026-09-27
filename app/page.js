"use client";

import { useState } from "react";

const EXAMPLE_CV = `Jordan Lee
jordan.lee@example.com

SUMMARY
Customer service professional with 4 years in retail and call-centre roles. Comfortable with spreadsheets and learning new software.

EXPERIENCE
Customer Support Advisor - BrightTel (2022-2025)
- Answered 60+ customer calls per day about billing and technical issues
- Logged tickets in Zendesk and escalated complex cases to tier 2
- Trained 5 new starters on the call scripts and ticketing system

Sales Assistant - HomeGoods Store (2020-2022)
- Handled till, returns and stock counts
- Built a simple Excel sheet to track weekly stock shortages

EDUCATION
BTEC Level 3 Business, City College (2020)

SKILLS
Zendesk, Excel, Microsoft Office, conflict resolution`;

const EXAMPLE_JOB = `Junior Operations Analyst - Parcelio (logistics start-up)

We're looking for a Junior Operations Analyst to help our customer operations team run smoothly.

You will:
- Monitor delivery issues and customer complaints and spot recurring patterns
- Build and maintain reports in Excel / Google Sheets and our BI tool (Looker)
- Work with support leads to improve processes and reduce ticket volume
- Present weekly findings to the operations manager

You have:
- 1-3 years in customer operations, support or a similar role
- Strong Excel skills (pivot tables, VLOOKUP/XLOOKUP)
- Basic SQL, or a willingness to learn it quickly
- Clear written and verbal communication
- Nice to have: experience with Looker or another BI tool`;

async function postJson(url, payload) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Couldn't connect. Check your internet connection and try again.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response (e.g. a platform timeout page).
  }
  if (!res.ok || !data) {
    throw new Error(data?.error || "The request took too long or failed. Please try again.");
  }
  return data;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked by the browser; nothing useful to do.
        }
      }}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function Section({ letter, title, copyText, children }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <span className="badge">{letter}</span> {title}
        </h2>
        {copyText ? <CopyButton text={copyText} /> : null}
      </div>
      {children}
    </section>
  );
}

function TailorResults({ r }) {
  const cvText = [
    r.tailoredSummary,
    ...r.tailoredExperience.map((e) => `${e.role}\n${e.bullets.map((b) => `- ${b}`).join("\n")}`),
  ].join("\n\n");

  return (
    <div className="results" aria-live="polite">
      <p className="review-note">
        ⚠️ Review everything below before sending it to an employer. Check every claim is true and fill in any{" "}
        <code>[placeholders]</code>.
      </p>

      <Section letter="A" title="Tailored CV" copyText={cvText}>
        <h3>Summary</h3>
        <p>{r.tailoredSummary}</p>
        {r.tailoredExperience.map((e, i) => (
          <div key={i}>
            <h3>{e.role}</h3>
            <ul>
              {e.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section letter="B" title="Skills gap">
        {r.skillsGap.length === 0 ? (
          <p>No significant gaps found. Your CV covers the main requirements.</p>
        ) : (
          <ul>
            {r.skillsGap.map((g, i) => (
              <li key={i}>
                <strong>{g.skill}</strong>
                {g.why ? <span className="muted"> - {g.why}</span> : null}
                {g.howToAddress ? <div className="action">→ {g.howToAddress}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section letter="C" title="Cover letter draft" copyText={r.coverLetter}>
        <div className="letter">
          {r.coverLetter.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Section>

      <Section letter="D" title="Likely interview questions">
        <ol>
          {r.interviewQuestions.map((q, i) => (
            <li key={i}>
              <strong>{q.question}</strong>
              {q.tip ? <div className="muted">Tip: {q.tip}</div> : null}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

function TailorTool() {
  const [cv, setCv] = useState("");
  const [job, setJob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await postJson("/api/tailor", { cv, job }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="card">
        <div className="grid2">
          <label>
            <span>Your CV</span>
            <textarea
              value={cv}
              onChange={(e) => setCv(e.target.value)}
              placeholder="Paste your CV text here…"
              rows={14}
              maxLength={20000}
              required
            />
          </label>
          <label>
            <span>Job description</span>
            <textarea
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="Paste the job advert here…"
              rows={14}
              maxLength={20000}
              required
            />
          </label>
        </div>
        <div className="actions">
          <button type="submit" className="primary" disabled={loading}>
            {loading ? "Tailoring…" : "Tailor my application"}
          </button>
          <button
            type="button"
            className="link"
            disabled={loading}
            onClick={() => {
              setCv(EXAMPLE_CV);
              setJob(EXAMPLE_JOB);
            }}
          >
            Fill with example
          </button>
        </div>
      </form>

      {loading ? (
        <div className="card loading" role="status">
          <div className="spinner" aria-hidden="true" />
          <div>
            <strong>Reading your CV and the job…</strong>
            <div className="muted">This usually takes 5-20 seconds.</div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="card error" role="alert">
          <strong>Sorry, that didn&apos;t work.</strong> {error}
        </div>
      ) : null}

      {result ? <TailorResults r={result} /> : null}
    </>
  );
}

export default function Home() {
  return (
    <main>
      <header>
        <h1>RampWay</h1>
        <p className="tagline">
          Tailor your CV to any job in seconds: rewrite, skills gap, cover letter and interview prep.
        </p>
      </header>

      <aside className="notice">
        <strong>Privacy &amp; AI notice.</strong> The text you enter is sent to our AI provider (Groq) to
        generate results. We don&apos;t store it, and there are no accounts. AI-generated hiring advice can be
        biased or wrong: always review and edit the output yourself before sending anything to an employer.
      </aside>

      <TailorTool />

      <footer>Built for a hackathon · AI model: gpt-oss-120b via Groq · Nothing you type is saved.</footer>
    </main>
  );
}
