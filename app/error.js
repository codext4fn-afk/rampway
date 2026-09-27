"use client";

// Safety net: if anything crashes while rendering, show this instead of a blank page.
export default function Error({ reset }) {
  return (
    <main>
      <div className="card error" role="alert">
        <strong>Something went wrong displaying this page.</strong> Your text wasn&apos;t saved anywhere.{" "}
        <button type="button" className="link" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </main>
  );
}
