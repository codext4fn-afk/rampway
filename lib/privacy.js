// Contact details the AI never needs. Removing them before any AI call means they are never sent to
// the provider. Phone-like runs need 9+ digits so date ranges such as "2022-2025" are left alone.
export function redactContact(text) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/(?:\+|\b00|\()?\d[\d\s().-]{7,}\d/g, (m) => (m.replace(/\D/g, "").length >= 9 ? "[phone removed]" : m));
}
