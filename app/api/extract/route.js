// Turns an uploaded CV (PDF or DOCX) into plain text.
// The file is processed in memory only: it is never written to disk or stored anywhere.
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { UserFacingError } from "../../../lib/groq";

export const maxDuration = 30;

// Vercel rejects request bodies over 4.5 MB, so stay safely under that.
const MAX_BYTES = 4 * 1024 * 1024;
const MIN_WORDS = 30;
const PASTE_INSTEAD = "Please paste your CV text into the box below instead.";

function fileKind(bytes) {
  const head = (n) => Array.from(bytes.subarray(0, n));
  if (String.fromCharCode(...head(4)) === "%PDF") return "pdf";
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return "docx"; // ZIP container ("PK")
  // OLE container: an old .doc file, or a password-protected .docx (Word encrypts into this format).
  if (head(4).join() === [0xd0, 0xcf, 0x11, 0xe0].join()) return "ole";
  return "unknown";
}

async function pdfToText(bytes) {
  let pdf;
  try {
    pdf = await getDocumentProxy(bytes);
  } catch (err) {
    if (err?.name === "PasswordException") {
      throw new UserFacingError(
        "This PDF is password-protected. Remove the password (or save an unprotected copy) and upload it again, or paste your CV text below.",
        422
      );
    }
    console.error("PDF parse failed:", err?.name, err?.message);
    throw new UserFacingError(`We couldn't open this PDF. It may be damaged. ${PASTE_INSTEAD}`, 422);
  }
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function docxToText(bytes) {
  try {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    // mammoth separates every paragraph with a blank line; keep one line per paragraph.
    return value.replace(/\n\n/g, "\n");
  } catch (err) {
    console.error("DOCX parse failed:", err?.message);
    throw new UserFacingError(`We couldn't open this Word file. It may be damaged. ${PASTE_INSTEAD}`, 422);
  }
}

// Tidy whitespace without destroying line structure (bullets, headings).
function clean(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req) {
  try {
    let file;
    try {
      file = (await req.formData()).get("file");
    } catch {
      throw new UserFacingError("The upload didn't arrive properly. Please try again.", 400);
    }
    if (!file || typeof file === "string") throw new UserFacingError("No file was received. Please choose a file.", 400);
    if (file.size === 0) throw new UserFacingError(`This file is empty. ${PASTE_INSTEAD}`, 422);
    if (file.size > MAX_BYTES) {
      throw new UserFacingError(
        "This file is over 4 MB. Try exporting your CV again as a PDF without images, or paste the text below.",
        413
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = fileKind(bytes);

    let raw;
    if (kind === "pdf") raw = await pdfToText(bytes);
    else if (kind === "docx") raw = await docxToText(bytes);
    else if (kind === "ole") {
      throw new UserFacingError(
        "This looks like an old .doc file or a password-protected Word file. In Word, remove any password and use File → Save As → .docx or PDF, then upload again, or paste your CV text below.",
        415
      );
    } else {
      throw new UserFacingError(`We can only read PDF or Word (.docx) files. ${PASTE_INSTEAD}`, 415);
    }

    const text = clean(raw ?? "");
    const words = text.split(/\s+/).filter(Boolean).length;

    if (words < MIN_WORDS) {
      throw new UserFacingError(
        kind === "pdf"
          ? `We couldn't read text from this PDF. It's probably a scanned image or a photo. ${PASTE_INSTEAD}`
          : `We couldn't find enough text in this file. ${PASTE_INSTEAD}`,
        422
      );
    }

    return Response.json({ text: text.slice(0, 20_000), words, truncated: text.length > 20_000 });
  } catch (err) {
    if (err instanceof UserFacingError) return Response.json({ error: err.message }, { status: err.status });
    console.error("Unexpected extract error:", err);
    return Response.json({ error: `Something went wrong reading your file. ${PASTE_INSTEAD}` }, { status: 500 });
  }
}
