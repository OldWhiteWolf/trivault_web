// Proposed boundary schema. Persistence, rate limits, consent versioning and Graph are separate.
export const choices = Object.freeze({
  audience: ["business", "consumer"],
  county: ["Miami-Dade", "Broward", "Other"],
  propertyType: [
    "Not sure",
    "Multifamily / HOA",
    "Hotel / short-term rental",
    "Commercial",
    "Single-family home",
    "Other",
  ],
  odorType: [
    "Smoke / tobacco",
    "Cannabis odor",
    "Pet odor",
    "Cooking / food",
    "Tenant turnover / mixed odors",
    "Fire / smoke residue",
    "Musty / moisture-related",
    "Unknown / other",
  ],
  timing: [
    "Not sure",
    "As soon as practical",
    "Within 2 weeks",
    "Planning ahead",
  ],
  sourceKnown: ["Yes", "No", "Not sure"],
});
export function validateOdorLead(input) {
  const errors = {};
  if (!input || typeof input !== "object" || Array.isArray(input))
    return { ok: false, errors: { form: "Expected an object" } };
  const limits = {
    name: 120,
    email: 254,
    phone: 40,
    company: 180,
    zip: 10,
    areas: 160,
    notes: 1200,
  };
  const required = ["name", "email"];
  const value = {};
  for (const [key, max] of Object.entries(limits)) {
    if (input[key] !== undefined && typeof input[key] !== "string") {
      errors[key] = "Expected text";
      continue;
    }
    const text = (input[key] || "").trim();
    if (
      text.length > max ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)
    )
      errors[key] = "Invalid length or characters";
    if (required.includes(key) && !text) errors[key] = "Required";
    value[key] = text;
  }
  for (const [key, values] of Object.entries(choices)) {
    const selected =
      input[key] ||
      (["propertyType", "timing", "sourceKnown"].includes(key)
        ? "Not sure"
        : "");
    if (!values.includes(selected)) errors[key] = "Choose an available option";
    else value[key] = selected;
  }
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))
    errors.email = "Enter a valid email";
  if (value.zip && !/^\d{5}(?:-\d{4})?$/.test(value.zip))
    errors.zip = "Enter a US ZIP code";
  if (value.audience === "business" && !value.company)
    errors.company = "Company is required for business inquiries";
  if (input.contactConsent !== true)
    errors.contactConsent = "Contact permission is required";
  value.contactConsent = input.contactConsent === true;
  const allowed = new Set([
    ...Object.keys(limits),
    ...Object.keys(choices),
    "contactConsent",
  ]);
  if (Object.keys(input).some((k) => !allowed.has(k)))
    errors.form = "Unexpected field";
  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, value };
}
