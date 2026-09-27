"use client";

import { useEffect, useRef, useState } from "react";

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

// Moroccan example: a French CV and a French job advert in Casablanca (the default demo).
const EXAMPLE_CV_FR = `Yasmine El Idrissi
yasmine.elidrissi@example.com | +212 6 12 34 56 78 | Casablanca

PROFIL
Diplômée en gestion (Licence, Université Hassan II, 2024). Stage de 6 mois en service client. Français, arabe et anglais.

EXPÉRIENCE
Conseillère clientèle (stage) - Centre d'appels Atlas, Casablanca (2024)
- Traitement de 50 appels par jour en français et en arabe
- Saisie et suivi des réclamations clients dans le CRM
- Participation à la formation de 2 nouveaux stagiaires

Vendeuse à temps partiel - Marjane, Casablanca (2022-2023)
- Encaissement, retours et conseil client
- Tenue d'un tableau Excel des ruptures de stock du rayon

FORMATION
Licence en gestion, Université Hassan II (2024)

COMPÉTENCES
Excel, Word, CRM, communication, français, arabe, anglais`;

const EXAMPLE_JOB_FR = `Chargé(e) de Relation Client Bilingue - Société de livraison e-commerce, Casablanca

Missions :
- Répondre aux clients par téléphone, e-mail et chat, en français et en arabe
- Suivre et résoudre les réclamations dans le CRM
- Produire un reporting hebdomadaire sous Excel (tableaux croisés dynamiques)
- Remonter les problèmes récurrents à l'équipe opérations

Profil :
- Bac+2/Bac+3
- 1 an d'expérience en relation client
- Maîtrise d'Excel (TCD, RECHERCHEV)
- Anglais professionnel apprécié
- Connaissance d'un outil de ticketing (Zendesk, Freshdesk) est un plus`;

/* ---------- network helpers ---------- */

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

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

async function extractCvText(file) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("This file is over 4 MB. Try exporting your CV again as a PDF without images, or paste the text below.");
  }
  if (!/\.(pdf|docx)$/i.test(file.name)) {
    throw new Error(
      /\.doc$/i.test(file.name)
        ? "Old .doc files aren't supported. In Word, use File → Save As → .docx or PDF, or paste your CV text below."
        : "Please upload a PDF or Word (.docx) file, or paste your CV text below."
    );
  }
  const form = new FormData();
  form.append("file", file);
  let res;
  try {
    res = await fetch("/api/extract", { method: "POST", body: form });
  } catch {
    throw new Error("Couldn't upload the file. Check your internet connection, or paste your CV text below.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response, e.g. the platform rejected a too-large upload.
  }
  if (res.status === 413 && !data) throw new Error("This file is too large. Please paste your CV text below instead.");
  if (!res.ok || !data) throw new Error(data?.error || "We couldn't read this file. Please paste your CV text below instead.");
  return data;
}

/* ---------- icons (inline so there are no extra requests) ---------- */

const Icon = {
  lock: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="1.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  ),
  scale: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v16M6 20h12M5 7h14M5 7l-2.5 6a3 3 0 0 0 5 0L5 7ZM19 7l-2.5 6a3 3 0 0 0 5 0L19 7Z" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V15" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
};

/* ---------- small shared pieces ---------- */

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`copy${copied ? " done" : ""}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // Clipboard blocked by the browser; nothing useful to do.
        }
      }}
    >
      {copied ? Icon.check : Icon.copy}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

// Shown when the main model was busy and the smaller backup model answered instead.
function BackupNote() {
  return (
    <span className="backup-note">
      {" "}
      Our main AI model was busy, so a smaller backup model answered. It follows our honesty rules less
      reliably, so check this one extra carefully.
    </span>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="alert" role="alert">
      <strong>That didn&apos;t work.</strong> {message}
    </div>
  );
}

// LLM calls take a few seconds, so show the stages of the work rather than a bare spinner.
// Stages advance on a timer (the API doesn't stream progress); the last one stays active until done.
function Progress({ title, steps }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - started) / 1000), 200);
    return () => clearInterval(id);
  }, []);
  const active = Math.min(Math.floor(elapsed / 1.6), steps.length - 1);

  return (
    <div className="progress" role="status" aria-live="polite">
      <div className="progress-head">
        <span className="eyebrow">Working</span>
        <span className="mono muted">{elapsed.toFixed(0)}s · usually 3–20s</span>
      </div>
      <p className="progress-title">{title}</p>
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={s} className={i < active ? "done" : i === active ? "active" : ""}>
            <span className="dot" aria-hidden="true">
              {i < active ? Icon.check : null}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${Math.min(92, (elapsed / 12) * 100)}%` }} />
      </div>
    </div>
  );
}

function useScrollIntoView(dep) {
  const ref = useRef(null);
  useEffect(() => {
    if (dep && ref.current) ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [dep]);
  return ref;
}

/* ---------- upload ---------- */

function UploadBox({ onText, disabled }) {
  const [status, setStatus] = useState({ kind: "idle" });
  const [dragging, setDragging] = useState(false);

  async function handle(file) {
    if (!file) return;
    setStatus({ kind: "busy", name: file.name });
    try {
      const { text, words, truncated } = await extractCvText(file);
      onText(text);
      setStatus({ kind: "ok", name: file.name, words, truncated });
    } catch (err) {
      setStatus({ kind: "error", message: err.message });
    }
  }

  const busy = status.kind === "busy";
  return (
    <div className="upload">
      <label
        className={`dropzone${dragging ? " dragging" : ""}${busy || disabled ? " busy" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy && !disabled) handle(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          disabled={busy || disabled}
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
        <span className="dz-icon">{Icon.upload}</span>
        {busy ? (
          <span className="dz-text">
            <strong>Reading {status.name}…</strong>
          </span>
        ) : (
          <span className="dz-text">
            <strong>Upload your CV</strong>
            <span className="muted">PDF or Word .docx · up to 4 MB · or drag it here</span>
          </span>
        )}
      </label>
      {status.kind === "ok" ? (
        <p className="upload-msg ok" role="status">
          {Icon.check}
          <span>
            Read {status.words} words from <strong>{status.name}</strong>
            {status.truncated ? " (trimmed to fit)" : ""}. Check the text below and fix anything that looks wrong.
            The file itself wasn&apos;t saved.
          </span>
        </p>
      ) : null}
      {status.kind === "error" ? (
        <p className="upload-msg bad" role="alert">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- feature 1: tailoring ---------- */

const TAILOR_STEPS = [
  "Reading your CV",
  "Matching it against the job's requirements",
  "Rewriting your summary and bullets",
  "Finding skills gaps",
  "Drafting your cover letter and interview prep",
];

const TAILOR_PREVIEW = [
  ["A", "Tailored CV", "Your summary and bullets rewritten for this job, using only what's really in your CV."],
  ["B", "Skills gap", "What the job asks for that your CV doesn't show yet, with one honest next step each."],
  ["C", "Cover letter", "A 200-word first draft you can edit and send."],
  ["D", "Interview prep", "Five questions you're likely to get, with a tip for each."],
];

function EmptyPreview({ items, note }) {
  return (
    <div className="empty">
      <p className="eyebrow">What you&apos;ll get</p>
      <div className="empty-grid">
        {items.map(([k, t, d]) => (
          <div className="empty-tile" key={t}>
            <span className="tile-key">{k}</span>
            <strong>{t}</strong>
            <span className="muted">{d}</span>
          </div>
        ))}
      </div>
      {note ? <p className="muted small">{note}</p> : null}
    </div>
  );
}

function ResultSection({ id, letter, title, meta, copyText, children }) {
  return (
    <section className="rsec" id={id} aria-labelledby={`${id}-h`}>
      <header className="rsec-head">
        <div>
          <span className="eyebrow">
            {letter} <span aria-hidden="true">/</span> {meta}
          </span>
          <h2 id={`${id}-h`}>{title}</h2>
        </div>
        {copyText ? <CopyButton text={copyText} /> : null}
      </header>
      <div className="rsec-body">{children}</div>
    </section>
  );
}

function TailorResults({ r }) {
  const cvText = [
    r.tailoredSummary,
    ...r.tailoredExperience.map((e) => `${e.role}\n${e.bullets.map((b) => `- ${b}`).join("\n")}`),
  ].join("\n\n");
  const gapText = r.skillsGap
    .map((g) => `${g.skill}${g.why ? ` - ${g.why}` : ""}${g.howToAddress ? `\n  Next step: ${g.howToAddress}` : ""}`)
    .join("\n");
  const qText = r.interviewQuestions
    .map((q, i) => `${i + 1}. ${q.question}${q.tip ? `\n   Tip: ${q.tip}` : ""}`)
    .join("\n");
  const all = [
    `TAILORED CV\n\n${cvText}`,
    `SKILLS GAP\n\n${gapText || "None found"}`,
    `COVER LETTER\n\n${r.coverLetter}`,
    `INTERVIEW QUESTIONS\n\n${qText}`,
  ].join("\n\n---\n\n");

  const jump = [
    ["r-cv", "A", "CV"],
    ["r-gap", "B", "Gaps"],
    ["r-letter", "C", "Letter"],
    ["r-qs", "D", "Interview"],
  ];

  return (
    <div className="results">
      <nav className="jumpbar" aria-label="Result sections">
        <div className="jump-links">
          {jump.map(([id, k, label]) => (
            <a key={id} href={`#${id}`}>
              <span className="tile-key">{k}</span>
              {label}
            </a>
          ))}
        </div>
        <CopyButton text={all} label="Copy all" />
      </nav>

      <div className="review">
        <span className="review-icon">{Icon.scale}</span>
        <p>
          <strong>Review before you send.</strong> Check every claim is true, and fill in any{" "}
          <code>[placeholders]</code> with real numbers. AI can make mistakes or reflect bias.
          {r.usedBackup ? <BackupNote /> : null}
          {r.removed && r.removed.emails + r.removed.phones > 0 ? (
            <span className="removed-note">
              {" "}
              {Icon.lock} Removed before sending to the AI:{" "}
              {[
                r.removed.emails ? `${r.removed.emails} email${r.removed.emails > 1 ? "s" : ""}` : "",
                r.removed.phones ? `${r.removed.phones} phone number${r.removed.phones > 1 ? "s" : ""}` : "",
              ]
                .filter(Boolean)
                .join(", ")}
              .
            </span>
          ) : null}
        </p>
      </div>

      <ResultSection id="r-cv" letter="A" meta="Tailored CV" title="Your CV, pointed at this job" copyText={cvText}>
        <p className="lede">{r.tailoredSummary}</p>
        {r.tailoredExperience.map((e, i) => (
          <div className="role" key={i}>
            <h3>{e.role}</h3>
            <ul className="bullets">
              {e.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </ResultSection>

      <ResultSection
        id="r-gap"
        letter="B"
        meta="Skills gap"
        title={r.skillsGap.length ? `${r.skillsGap.length} thing${r.skillsGap.length > 1 ? "s" : ""} to work on` : "No major gaps"}
        copyText={gapText || null}
      >
        {r.skillsGap.length === 0 ? (
          <p>Your CV covers the main requirements of this job.</p>
        ) : (
          <ol className="gaps">
            {r.skillsGap.map((g, i) => (
              <li key={i}>
                <div className="gap-top">
                  <span className="gap-n mono">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{g.skill}</strong>
                    {g.why ? <p className="muted">{g.why}</p> : null}
                  </div>
                </div>
                {g.howToAddress ? (
                  <p className="next-step">
                    {Icon.arrow}
                    <span>{g.howToAddress}</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </ResultSection>

      <ResultSection
        id="r-letter"
        letter="C"
        meta="Cover letter"
        title="A first draft"
        copyText={r.coverLetter}
      >
        <div className="letter">
          {r.coverLetter.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </ResultSection>

      <ResultSection id="r-qs" letter="D" meta="Interview prep" title="Questions to expect" copyText={qText}>
        <ol className="questions">
          {r.interviewQuestions.map((q, i) => (
            <li key={i}>
              <span className="q-n" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <p className="q">{q.question}</p>
                {q.tip ? (
                  <p className="muted">
                    <span className="mono tip-label">Tip</span> {q.tip}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </ResultSection>
    </div>
  );
}

function TailorTool({ cv, setCv }) {
  const [job, setJob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const outRef = useScrollIntoView(loading || result);

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
      <form onSubmit={onSubmit} className="panel">
        <div className="grid2">
          <div className="field">
            <label htmlFor="cv-text" className="field-label">
              <span className="mono step-n">01</span> Your CV
            </label>
            <UploadBox onText={setCv} disabled={loading} />
            <textarea
              id="cv-text"
              value={cv}
              onChange={(e) => setCv(e.target.value)}
              placeholder="…or paste your CV text here"
              rows={13}
              maxLength={20000}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="job-text" className="field-label">
              <span className="mono step-n">02</span> The job
            </label>
            <textarea
              id="job-text"
              className="tall"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="Paste the full job advert: title, responsibilities and requirements"
              rows={18}
              maxLength={20000}
              required
            />
          </div>
        </div>
        <div className="actions">
          <button type="submit" className="primary" disabled={loading}>
            {loading ? "Tailoring…" : "Tailor my application"}
            {loading ? null : Icon.arrow}
          </button>
          <button
            type="button"
            className="ghost"
            disabled={loading}
            onClick={() => {
              setCv(EXAMPLE_CV_FR);
              setJob(EXAMPLE_JOB_FR);
            }}
          >
            Try an example
          </button>
          <button
            type="button"
            className="ghost"
            disabled={loading}
            onClick={() => {
              setCv(EXAMPLE_CV);
              setJob(EXAMPLE_JOB);
            }}
          >
            English example
          </button>
        </div>
        <PrivacyLine />
      </form>

      <div ref={outRef} className="output">
        {loading ? <Progress title="Tailoring your application" steps={TAILOR_STEPS} /> : null}
        {error ? <ErrorBox message={error} /> : null}
        {result ? <TailorResults r={result} /> : null}
        {!loading && !error && !result ? <EmptyPreview items={TAILOR_PREVIEW} /> : null}
      </div>
    </>
  );
}

/* ---------- feature 2: bridge income ---------- */

const BRIDGE_STEPS = [
  "Reading your skills and situation",
  "Thinking about work that exists in your area",
  "Checking it fits your hours and transport",
  "Writing a first step for each option",
];

function BridgeTool({ cv }) {
  const [skills, setSkills] = useState("");
  const [city, setCity] = useState("");
  const [hours, setHours] = useState("15");
  const [hasVehicle, setHasVehicle] = useState(false);
  const [useCv, setUseCv] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const outRef = useScrollIntoView(loading || result);
  const hasCv = cv.trim().length > 0;

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await postJson("/api/bridge", {
          skills,
          city,
          hours: Number(hours),
          hasVehicle,
          cv: hasCv && useCv ? cv : "",
        })
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const allText = result
    ? result.options
        .map(
          (o, i) =>
            `${i + 1}. ${o.title}\n${o.whyItFits}\nPay: ${o.estimatedEarnings}\nHow to start: ${o.howToStart}${o.watchOut ? `\nWatch out: ${o.watchOut}` : ""}`
        )
        .join("\n\n")
    : "";

  return (
    <>
      <form onSubmit={onSubmit} className="panel">
        <p className="panel-intro">
          Need money coming in while you job-hunt? Get 3–5 realistic short-term options you could start this week.
        </p>
        <div className="field">
          <label htmlFor="skills" className="field-label">
            <span className="mono step-n">01</span> Your skills
          </label>
          <textarea
            id="skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g. customer service, Excel, speak Spanish, good with kids, basic DIY"
            rows={3}
            maxLength={2000}
            required={!(hasCv && useCv)}
          />
          {hasCv ? (
            <label className="check">
              <input type="checkbox" checked={useCv} onChange={(e) => setUseCv(e.target.checked)} />
              <span>Also use the CV from the &quot;Tailor my CV&quot; tab</span>
            </label>
          ) : null}
        </div>
        <div className="grid3">
          <div className="field">
            <label htmlFor="city" className="field-label">
              <span className="mono step-n">02</span> City or town
            </label>
            <input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Manchester"
              maxLength={100}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="hours" className="field-label">
              <span className="mono step-n">03</span> Hours free / week
            </label>
            <input
              id="hours"
              type="number"
              inputMode="numeric"
              min={1}
              max={80}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <span className="field-label" id="vehicle-label">
              <span className="mono step-n">04</span> Vehicle?
            </span>
            <div className="seg" role="radiogroup" aria-labelledby="vehicle-label">
              {[
                [false, "No"],
                [true, "Yes"],
              ].map(([v, label]) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={hasVehicle === v}
                  className={hasVehicle === v ? "on" : ""}
                  onClick={() => setHasVehicle(v)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="actions">
          <button type="submit" className="primary" disabled={loading}>
            {loading ? "Finding options…" : "Find bridge income"}
            {loading ? null : Icon.arrow}
          </button>
          <button
            type="button"
            className="ghost"
            disabled={loading}
            onClick={() => {
              setSkills("Customer service, French, Arabic, English, Excel, CRM, cash handling");
              setCity("Casablanca");
              setHours("20");
              setHasVehicle(false);
            }}
          >
            Try an example
          </button>
        </div>
        <PrivacyLine />
      </form>

      <div ref={outRef} className="output">
        {loading ? <Progress title="Finding options near you" steps={BRIDGE_STEPS} /> : null}
        {error ? <ErrorBox message={error} /> : null}
        {result ? (
          <div className="results">
            <nav className="jumpbar" aria-label="Bridge income results">
              <span className="eyebrow">{result.options.length} options</span>
              <CopyButton text={allText} label="Copy all" />
            </nav>
            <div className="review">
              <span className="review-icon">{Icon.scale}</span>
              <p>
                <strong>Ideas, not job listings.</strong> Check each one yourself. Pay figures are rough estimates, and
                you should never pay an upfront fee to start work.
                {result.usedBackup ? <BackupNote /> : null}
              </p>
            </div>
            <div className="options">
              {result.options.map((o, i) => (
                <article className="option" key={i}>
                  <span className="opt-n mono">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{o.title}</h3>
                  {o.whyItFits ? <p>{o.whyItFits}</p> : null}
                  {o.estimatedEarnings ? (
                    <p className="pay">
                      <span className="mono">Pay</span> {o.estimatedEarnings}
                    </p>
                  ) : null}
                  <p className="next-step">
                    {Icon.arrow}
                    <span>
                      <strong>Start:</strong> {o.howToStart}
                    </span>
                  </p>
                  {o.watchOut ? <p className="muted small">Watch out: {o.watchOut}</p> : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}
        {!loading && !error && !result ? (
          <EmptyPreview
            items={[
              ["→", "3–5 options", "Matched to your skills, city, hours and whether you have a vehicle."],
              ["→", "A first step for each", "One concrete thing to do today or tomorrow."],
              ["→", "Honest caveats", "Fees, checks or permits to know about before you start."],
            ]}
          />
        ) : null}
      </div>
    </>
  );
}

/* ---------- page ---------- */

// Animated "on-ramp": the line draws itself, milestones A-D appear, and a signal dot climbs to "Hired".
function HeroArt() {
  const ramp = "M16 250 H112 L176 186 H240 L304 122 H368 L432 58";
  const stops = [
    [112, 250, "A", "CV"],
    [176, 186, "B", "Gaps"],
    [240, 186, "C", "Letter"],
    [304, 122, "D", "Interview", true],
  ];
  return (
    <svg className="hero-art" viewBox="0 0 460 290" role="img" aria-label="A ramp climbing from your CV to getting hired">
      <g className="grid-lines" aria-hidden="true">
        {[58, 122, 186, 250].map((y) => (
          <line key={y} x1="0" x2="460" y1={y} y2={y} />
        ))}
      </g>
      <path className="ramp-shadow" d={ramp} transform="translate(6 6)" />
      <path className="ramp" d={ramp} pathLength="1" />
      {stops.map(([x, y, k, label, above], i) => (
        <g key={k} className="stop" style={{ animationDelay: `${0.9 + i * 0.22}s` }}>
          <circle cx={x} cy={y} r="13" />
          <text x={x} y={y + 4} textAnchor="middle" className="stop-k">
            {k}
          </text>
          <text x={x} y={above ? y - 24 : y + 34} textAnchor="middle" className="stop-label">
            {label}
          </text>
        </g>
      ))}
      <g className="goal" style={{ animationDelay: "1.9s" }}>
        <circle cx="432" cy="58" r="17" />
        <path d="m424 58 6 6 11-12" />
        <text x="432" y="26" textAnchor="middle" className="stop-label goal-label">
          Hired
        </text>
      </g>
      <circle className="runner" r="6">
        <animateMotion dur="5s" begin="2.2s" repeatCount="indefinite" path={ramp} keyPoints="0;1;1" keyTimes="0;0.8;1" calcMode="linear" />
      </circle>
    </svg>
  );
}

function PrivacyLine() {
  return (
    <p className="privacy-line">
      {Icon.lock}
      <span>
        Not stored: email addresses and phone numbers are removed, then your text is sent to Groq&apos;s AI to
        generate results and discarded. AI can be wrong or biased, so review everything before sending it to an
        employer. Answers come back in the job advert&apos;s language.
      </span>
    </p>
  );
}

const TABS = [
  { id: "tailor", n: "01", label: "Tailor my CV" },
  { id: "bridge", n: "02", label: "Bridge income" },
];

export default function Home() {
  const [tab, setTab] = useState("tailor");
  // The CV is the shared profile: pasted or uploaded once, used by both tools.
  const [cv, setCv] = useState("");

  return (
    <main>
      <header className="masthead">
        <div className="brand">
          <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M3 27h26M3 27 22 8h7" />
          </svg>
          <span>RampWay</span>
        </div>
        <div className="hero">
          <div className="hero-copy">
            <h1>
              <span className="line">Get the job.</span>
              <em className="line">Cover the gap.</em>
            </h1>
            <p className="standfirst">
              Upload your CV and a job advert to get a tailored CV, an honest skills gap, a cover letter and
              interview prep. Need income while you search? We&apos;ll suggest work you could start this week.
            </p>
          </div>
          <HeroArt />
        </div>
      </header>

      <nav className="tabs" role="tablist" aria-label="Tools">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={tab === t.id ? "tab active" : "tab"}
            onClick={() => setTab(t.id)}
          >
            <span className="mono">{t.n}</span> {t.label}
          </button>
        ))}
      </nav>

      {/* Both tools stay mounted so switching tabs keeps what you typed. */}
      <div id="panel-tailor" role="tabpanel" aria-labelledby="tab-tailor" hidden={tab !== "tailor"}>
        <TailorTool cv={cv} setCv={setCv} />
      </div>
      <div id="panel-bridge" role="tabpanel" aria-labelledby="tab-bridge" hidden={tab !== "bridge"}>
        <BridgeTool cv={cv} />
      </div>

      <footer className="colophon">
        <span>RampWay · hackathon build</span>
        <span>Model: gpt-oss-120b via Groq</span>
        <span>Nothing you enter is saved</span>
      </footer>
    </main>
  );
}
