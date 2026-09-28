export const SCHEMA_VERSION = "1.0";
const yes = ["Yes", "No", "Not sure"];
const text = (key, label, extra = {}) => ({
  key,
  label,
  type: "text",
  max: 180,
  ...extra,
});
const choice = (key, label, options, extra = {}) => ({
  key,
  label,
  type: "select",
  options,
  ...extra,
});
const number = (key, label, max = 1000000, extra = {}) => ({
  key,
  label,
  type: "number",
  min: 0,
  max,
  ...extra,
});
const notes = (key, label) => text(key, label, { type: "textarea", max: 2000 });
const scope = [
  "Detach & Reset",
  "Remove & Replace",
  "Repair",
  "Existing / No Work",
  "Unknown",
];
const units = ["EA", "LF", "SF", "SQ", "HR"];
export const assessments = [
  "Localized repair appears feasible",
  "Repairability concern identified",
  "Additional evaluation required",
  "Replacement scope submitted/requested",
  "No determination",
];
export const testTypes = [
  "Brittleness / Repairability Test",
  "Shingle Lift / Manipulation Test",
  "Adhesion / Seal Strip Condition",
  "Water Test",
  "Tile repairability",
];
export const categories = {
  photo: [
    "Property Overview / Front",
    "Property Overview / Rear",
    "Property Overview / Left",
    "Property Overview / Right",
    "Roof / Front slope",
    "Roof / Rear slope",
    "Roof / Left slope",
    "Roof / Right slope",
    "Roof / Additional slope",
    "Damage / Wide",
    "Damage / Medium",
    "Damage / Close-up",
    "Components",
    "Interior / Attic",
    "Interior / Deck underside",
    "Interior / Ceiling",
    "Interior / Walls",
    "Field Testing",
    "Other photo",
  ],
  document: [
    "EagleView",
    "GAF QuickMeasure",
    "HOVER",
    "Roofr",
    "Other Measurement Report",
    "Carrier Estimate",
    "Adjuster Estimate",
    "Contractor Estimate",
    "ESX",
    "Scope Sheet",
    "Permit",
    "Product Approval / NOA",
    "Invoice",
    "Proposal",
    "Code Documentation",
    "Field Test Report",
    "Other Document",
  ],
  video: ["Field Testing Video", "Damage Video", "Other Video"],
};
export const definitions = {
  job: [
    choice(
      "clientType",
      "Your role",
      [
        "Roofing Contractor",
        "Restoration Company",
        "Public Adjuster",
        "Attorney / Law Firm",
        "Insurance / IA",
        "Property Manager",
        "Property Owner",
        "Other",
      ],
      { required: true },
    ),
    text("clientOther", "Please describe your role", {
      when: ["clientType", "Other"],
      required: true,
    }),
    text("company", "Company"),
    text("name", "Contact name", {
      required: true,
      autocomplete: "name",
      max: 120,
    }),
    text("email", "Email", {
      type: "email",
      required: true,
      autocomplete: "email",
      max: 254,
    }),
    text("phone", "Phone", {
      type: "tel",
      required: true,
      autocomplete: "tel",
      max: 40,
    }),
    text("address", "Property street address", {
      required: true,
      autocomplete: "street-address",
      max: 500,
    }),
    text("city", "City", { required: true, autocomplete: "address-level2" }),
    text("state", "State", {
      required: true,
      default: "FL",
      max: 2,
      autocomplete: "address-level1",
    }),
    text("zip", "ZIP code", {
      required: true,
      max: 10,
      autocomplete: "postal-code",
    }),
    choice(
      "requestType",
      "Type of request",
      [
        "Insurance Claim Estimate",
        "Roof Replacement Estimate",
        "Supplement",
        "Estimate Review / Comparison",
        "Roof Scope",
        "Roof Sketch",
        "Repairability Review",
        "Other",
      ],
      { required: true },
    ),
    text("requestOther", "Describe the request", {
      when: ["requestType", "Other"],
      required: true,
    }),
    choice(
      "insuranceRelated",
      "Is this related to an insurance claim?",
      ["Yes", "No"],
      { required: true },
    ),
    notes("instructions", "Project priorities or instructions"),
  ],
  claim: [
    text("carrier", "Insurance carrier"),
    text("claimNumber", "Claim / case number"),
    text("dateOfLoss", "Date of loss", { type: "date" }),
    choice("cause", "Cause of loss", [
      "Wind",
      "Hurricane",
      "Hail",
      "Fire",
      "Tree impact",
      "Leak / Water",
      "Other",
      "Not sure",
    ]),
    text("causeOther", "Describe the cause", { when: ["cause", "Other"] }),
    text("adjusterName", "Adjuster name"),
    text("adjusterEmail", "Adjuster email", { type: "email", max: 254 }),
    choice("carrierEstimate", "Carrier / adjuster estimate available?", yes),
    choice("previousEstimate", "Previous estimate available?", yes),
    choice("contractorEstimate", "Contractor estimate available?", yes),
  ],
  measurements: [
    choice(
      "source",
      "How will roof measurements be provided?",
      [
        "EagleView",
        "GAF QuickMeasure",
        "HOVER",
        "Roofr",
        "Xactimate / ESX",
        "Other Measurement Report",
        "Manual Measurements",
        "I Need TriVault to Obtain Measurements",
        "Not sure",
      ],
      { required: true },
    ),
    text("otherSource", "Measurement source", {
      when: ["source", "Other Measurement Report"],
    }),
    choice(
      "manualOverride",
      "Add optional manual measurements?",
      ["No", "Yes"],
      { default: "No" },
    ),
  ],
  structures: [
    choice(
      "type",
      "Structure",
      [
        "Main Dwelling",
        "Attached Garage",
        "Detached Garage",
        "Shed",
        "Pool House",
        "Carport",
        "Other",
      ],
      { required: true },
    ),
    text("name", "Structure name / description"),
    number("areaSF", "Roof area (SF)"),
    number("squares", "Squares (SQ)"),
    number("facetCount", "Facet count", 1000, { integer: true }),
    text("pitch", "Pitch, if known", { max: 80 }),
    notes("pitchAreas", "Pitch-specific areas, if available"),
    ...[
      "Eaves",
      "Rakes",
      "Ridges",
      "Hips",
      "Valleys",
      "Step flashing",
      "Wall flashing",
      "Drip edge",
      "Starter",
      "Ridge / Hip cap",
    ].map((label) =>
      number(
        label.toLowerCase().replace(/[^a-z]/g, "") + "LF",
        label + " (LF)",
      ),
    ),
  ],
  roof: [
    choice(
      "slopeClass",
      "Roof configuration",
      ["Steep-slope", "Low-slope", "Mixed", "Not sure"],
      { default: "Not sure" },
    ),
    choice(
      "steepSystem",
      "Steep-slope system",
      [
        "3-Tab Asphalt Shingle",
        "Architectural / Laminated Shingle",
        "Designer / Premium Shingle",
        "Concrete Tile",
        "Clay Tile",
        "Standing Seam Metal",
        "Exposed Fastener Metal",
        "Wood Shake / Shingle",
        "Slate",
        "Synthetic / Composite",
        "Other",
        "Not sure",
      ],
      { when: ["slopeClass", ["Steep-slope", "Mixed"]] },
    ),
    choice(
      "lowSystem",
      "Low-slope system",
      [
        "Modified Bitumen APP",
        "Modified Bitumen SBS",
        "Built-Up Roofing",
        "TPO",
        "PVC",
        "EPDM",
        "SPF",
        "Liquid Applied",
        "Other",
        "Not sure",
      ],
      { when: ["slopeClass", ["Low-slope", "Mixed"]] },
    ),
    text("systemOther", "Other roofing system", {
      whenAny: [
        ["steepSystem", "Other"],
        ["lowSystem", "Other"],
      ],
    }),
    number("layers", "Existing layers", 20, { integer: true }),
    number("age", "Approximate roof age (years)", 150),
    number("installationYear", "Installation year", 2100, {
      min: 1900,
      integer: true,
    }),
    text("permitNumber", "Existing permit number"),
    text("existingUnderlayment", "Existing underlayment"),
    text("proposedUnderlayment", "Proposed underlayment, if instructed"),
    choice("deckMaterial", "Deck material", [
      "Plywood",
      "OSB",
      "Plank",
      "Concrete",
      "Metal",
      "Other",
      "Not sure",
    ]),
    text("deckThickness", "Deck thickness"),
    choice("deckReplacement", "Deck replacement anticipated?", yes, {
      default: "Not sure",
    }),
    number("deckReplacementSF", "Approximate deck replacement (SF)", 1000000, {
      when: ["deckReplacement", "Yes"],
    }),
    choice("deckRenailing", "Deck renailing anticipated?", yes, {
      default: "Not sure",
    }),
    number("renailSF", "Approximate renail area (SF)", 1000000, {
      when: ["deckRenailing", "Yes"],
    }),
  ],
  components: [
    choice(
      "type",
      "Component",
      [
        "Ridge Vent",
        "Off-Ridge Vent",
        "Turtle / Static Vent",
        "Turbine Vent",
        "Bathroom Exhaust",
        "Dryer Exhaust",
        "Power Attic Fan",
        "HVAC Roof Vent",
        "Pipe Jack",
        "Lead Boot",
        "Copper Boot",
        "Plumbing Vent",
        "Other Penetration",
        "Drip Edge",
        "Step Flashing",
        "Counter Flashing",
        "Apron Flashing",
        "Headwall Flashing",
        "Sidewall Flashing",
        "Valley Metal",
        "Roll Flashing",
        "Chimney Flashing",
        "Parapet / Coping",
        "Skylight",
        "Chimney",
        "Satellite Dish",
        "Solar Panels",
        "Antenna",
        "Other",
      ],
      { required: true },
    ),
    number("quantity", "Quantity"),
    choice("unit", "Unit", units),
    text("material", "Existing material / type"),
    text("size", "Size"),
    choice("scope", "Requested scope", scope, { default: "Unknown" }),
    text("photoReference", "Photo reference, if known"),
    notes("notes", "Notes"),
  ],
  exterior: [
    choice("guttersIncluded", "Gutters present / included?", yes, {
      default: "No",
    }),
    text("gutterMaterial", "Gutter material", {
      when: ["guttersIncluded", "Yes"],
    }),
    text("gutterSize", "Gutter size", { when: ["guttersIncluded", "Yes"] }),
    number("gutterLF", "Gutter length (LF)", 100000, {
      when: ["guttersIncluded", "Yes"],
    }),
    number("downspoutCount", "Number of downspouts", 1000, {
      when: ["guttersIncluded", "Yes"],
      integer: true,
    }),
    number("downspoutLF", "Downspout length (LF)", 100000, {
      when: ["guttersIncluded", "Yes"],
    }),
    choice("guards", "Gutter guards / screens", yes, {
      when: ["guttersIncluded", "Yes"],
    }),
    choice("gutterScope", "Gutter scope", scope, {
      when: ["guttersIncluded", "Yes"],
    }),
    choice("fasciaIncluded", "Include fascia details?", yes, { default: "No" }),
    text("fasciaMaterial", "Fascia material", {
      when: ["fasciaIncluded", "Yes"],
    }),
    text("fasciaWidth", "Fascia width", { when: ["fasciaIncluded", "Yes"] }),
    number("fasciaLF", "Fascia affected (LF)", 100000, {
      when: ["fasciaIncluded", "Yes"],
    }),
    choice("fasciaScope", "Fascia scope", scope, {
      when: ["fasciaIncluded", "Yes"],
    }),
    choice("soffitIncluded", "Include soffit details?", yes, { default: "No" }),
    text("soffitMaterial", "Soffit material", {
      when: ["soffitIncluded", "Yes"],
    }),
    text("soffitWidth", "Soffit width", { when: ["soffitIncluded", "Yes"] }),
    number("soffitQuantity", "Soffit affected quantity", 100000, {
      when: ["soffitIncluded", "Yes"],
    }),
    choice("soffitUnit", "Soffit unit", ["SF", "LF"], {
      when: ["soffitIncluded", "Yes"],
    }),
    choice("soffitScope", "Soffit scope", scope, {
      when: ["soffitIncluded", "Yes"],
    }),
  ],
  damage: [
    text("structure", "Structure"),
    text("location", "Slope / location", { required: true }),
    notes("condition", "Observed damage / condition"),
    text("requestedRepair", "Requested repair"),
    number("quantity", "Quantity"),
    choice("unit", "Unit", units),
    text("measurementSource", "Measurement source"),
    text("photoReference", "Photo reference"),
    notes("notes", "Notes"),
  ],
  tests: [
    choice("type", "Test", testTypes, { required: true }),
    choice("performed", "Was this test performed?", ["Yes", "No"], {
      default: "No",
      required: true,
    }),
    text("method", "Method used", { when: ["performed", "Yes"] }),
    text("location", "Location / slope / area tested", {
      when: ["performed", "Yes"],
    }),
    text("material", "Shingle / material / tile type tested", {
      when: ["performed", "Yes"],
    }),
    number("attempts", "Number of test attempts", 1000, {
      when: ["performed", "Yes"],
      integer: true,
    }),
    notes(
      "observations",
      "What occurred during manipulation / lift / testing?",
    ),
    choice(
      "result",
      "Reported result",
      ["Pass", "Fail", "Inconclusive", "Not reported"],
      { when: ["performed", "Yes"], default: "Not reported" },
    ),
    choice(
      "surroundingDamage",
      "Surrounding / adjacent material damaged during manipulation?",
      yes,
      {
        when: [
          "type",
          ["Shingle Lift / Manipulation Test", "Tile repairability"],
        ],
      },
    ),
    text(
      "observedChanges",
      "Creasing / cracking / tearing / granule loss observed",
      { when: ["type", "Shingle Lift / Manipulation Test"] },
    ),
    choice(
      "sealCondition",
      "Seal strip condition",
      ["Sealed", "Partially sealed", "Unsealed", "Unknown"],
      { when: ["type", "Adhesion / Seal Strip Condition"] },
    ),
    text("duration", "Water test duration", { when: ["type", "Water Test"] }),
    choice(
      "waterEntry",
      "Water entry observed",
      ["Yes", "No", "Inconclusive"],
      { when: ["type", "Water Test"] },
    ),
    text("interiorLocation", "Interior location affected", {
      when: ["type", "Water Test"],
    }),
    choice(
      "replacementAvailable",
      "Matching / replacement tile available?",
      yes,
      { when: ["type", "Tile repairability"] },
    ),
    text("breakage", "Breakage during manipulation", {
      when: ["type", "Tile repairability"],
    }),
    text("adjacentCondition", "Adjacent tile condition", {
      when: ["type", "Tile repairability"],
    }),
    text("performedBy", "Performed by", { when: ["performed", "Yes"] }),
    text("company", "Testing company", { when: ["performed", "Yes"] }),
    choice(
      "role",
      "Role of person performing the test",
      [
        "Roofer / Contractor",
        "Public Adjuster",
        "Inspector",
        "Engineer",
        "Property Owner",
        "Other",
        "Not provided",
      ],
      { when: ["performed", "Yes"] },
    ),
    text("date", "Date performed", {
      type: "date",
      when: ["performed", "Yes"],
    }),
    choice(
      "documentationSource",
      "Documentation source",
      [
        "Direct observation by submitter",
        "Third-party report",
        "Third-party photos / video",
        "Client statement",
        "Other",
        "Not provided",
      ],
      { when: ["performed", "Yes"] },
    ),
    notes("notes", "Additional notes"),
  ],
  settings: [
    choice(
      "platform",
      "Estimating platform",
      [
        "Xactimate",
        "Symbility",
        "Contractor Pricing",
        "Other",
        "Let estimator determine",
      ],
      { default: "Let estimator determine" },
    ),
    text("platformOther", "Other platform", { when: ["platform", "Other"] }),
    choice(
      "priceList",
      "Price list basis",
      ["Current", "Date of Loss", "Specific Month", "Let Estimator Determine"],
      { default: "Let Estimator Determine" },
    ),
    text("priceMonth", "Specific month", {
      type: "month",
      when: ["priceList", "Specific Month"],
      required: true,
    }),
    choice(
      "permit",
      "Permit allowance",
      ["Include if applicable", "Known permit cost", "Let estimator review"],
      { default: "Let estimator review" },
    ),
    number("permitCost", "Known permit cost ($)", 1000000, {
      when: ["permit", "Known permit cost"],
    }),
    choice(
      "overheadProfit",
      "Overhead & profit instruction",
      ["Include if instructed", "Do not include", "Let estimator review"],
      { default: "Let estimator review" },
    ),
    choice("dumpster", "Dumpster requested?", yes, { default: "Not sure" }),
    choice(
      "dumpsterSize",
      "Dumpster size",
      ["12 yd", "20 yd", "30 yd", "40 yd", "Other", "Not sure"],
      { when: ["dumpster", "Yes"] },
    ),
    text("dumpsterOther", "Other dumpster size", {
      when: ["dumpsterSize", "Other"],
    }),
    {
      key: "access",
      label: "Access / complexity considerations",
      type: "multi",
      options: [
        "2+ Stories",
        "Steep Roof",
        "Limited Access",
        "Gated Property",
        "Crane / Lift",
        "Landscaping Protection",
        "Material Staging Restrictions",
        "Occupied Property",
        "Other",
      ],
    },
    text("accessOther", "Other access considerations"),
    text("jurisdiction", "Jurisdiction / municipality"),
    choice("hvhz", "HVHZ status, if known", ["Yes", "No", "Unknown"], {
      default: "Unknown",
    }),
    text("codeReference", "Code edition / reference supplied, if known"),
    text("productApproval", "Product approval / NOA reference, if known"),
    notes("notes", "Additional estimating instructions"),
  ],
};
export function visible(field, record) {
  const match = ([key, val]) =>
    (Array.isArray(val) ? val : [val]).includes(record?.[key]);
  return (
    (!field.when || match(field.when)) &&
    (!field.whenAny || field.whenAny.some(match))
  );
}
export const insuranceJob = (data) => data?.job?.insuranceRelated === "Yes";
export const repairRelevant = (data) =>
  insuranceJob(data) ||
  ["Supplement", "Repairability Review"].includes(data?.job?.requestType);
export const tileRoof = (data) =>
  ["Concrete Tile", "Clay Tile"].includes(data?.roof?.steepSystem);
const blank = (value) => value === undefined || value === null || value === "";
export function validateRoof(input, { partial = false } = {}) {
  const errors = {};
  const value = { schemaVersion: SCHEMA_VERSION };
  const fail = (key, message) => {
    errors[key] = message;
  };
  const object = (x) => x && typeof x === "object" && !Array.isArray(x);
  if (!object(input))
    return { ok: false, errors: { form: "Invalid intake data." } };
  const allowed = new Set([
    "schemaVersion",
    "job",
    "claim",
    "measurements",
    "structures",
    "roof",
    "components",
    "exterior",
    "damage",
    "tests",
    "settings",
    "attachments",
    "contactConsent",
    "evidenceAcknowledged",
  ]);
  for (const k of Object.keys(input))
    if (!allowed.has(k)) fail(k, "Unexpected field.");
  if (input.schemaVersion !== SCHEMA_VERSION)
    fail("schemaVersion", "Unsupported intake version.");
  function record(section, raw, prefix = section) {
    raw = raw ?? {};
    if (!object(raw)) {
      fail(prefix, "Expected a record.");
      return {};
    }
    const fields = definitions[section],
      result = {},
      known = new Set(fields.map((f) => f.key));
    if (["structures", "components", "damage", "tests"].includes(section))
      known.add("id");
    for (const k of Object.keys(raw))
      if (!known.has(k)) fail(prefix + "." + k, "Unexpected field.");
    if (known.has("id")) {
      if (typeof raw.id !== "string" || !/^r_[a-zA-Z0-9_-]{8,60}$/.test(raw.id))
        fail(prefix + ".id", "Invalid item reference.");
      else result.id = raw.id;
    }
    for (const f of fields) {
      if (!visible(f, raw)) continue;
      if (
        section === "tests" &&
        raw.performed !== "Yes" &&
        !["type", "performed", "notes"].includes(f.key)
      )
        continue;
      let v = raw[f.key] ?? f.default ?? (f.type === "multi" ? [] : "");
      const key = prefix + "." + f.key;
      if (blank(v)) {
        if (f.required && !partial) fail(key, "Required.");
        result[f.key] = f.type === "number" ? null : "";
        continue;
      }
      if (f.type === "number") {
        if (
          typeof v !== "number" ||
          !Number.isFinite(v) ||
          v < (f.min ?? 0) ||
          v > f.max ||
          (f.integer && !Number.isInteger(v))
        )
          fail(
            key,
            "Enter a valid non-negative number within the allowed range.",
          );
        else result[f.key] = v;
        continue;
      }
      if (f.type === "multi") {
        if (
          !Array.isArray(v) ||
          v.length > f.options.length ||
          v.some((x) => !f.options.includes(x))
        )
          fail(key, "Choose available options.");
        else result[f.key] = [...new Set(v)];
        continue;
      }
      if (typeof v !== "string") {
        fail(key, "Expected text.");
        continue;
      }
      v = v.trim();
      if (
        v.length > (f.max ?? 180) ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)
      )
        fail(key, "Text is too long or contains invalid characters.");
      if (f.required && !v && !partial) fail(key, "Required.");
      if (f.options && v && !f.options.includes(v))
        fail(key, "Choose an available option.");
      if (f.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        fail(key, "Enter a valid email.");
      if (
        f.type === "date" &&
        v &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(v) ||
          !Number.isFinite(Date.parse(v)) ||
          new Date(v).toISOString().slice(0, 10) !== v ||
          v > new Date().toISOString().slice(0, 10))
      )
        fail(key, "Enter a valid date that is not in the future.");
      if (f.type === "month" && v && !/^\d{4}-(0[1-9]|1[0-2])$/.test(v))
        fail(key, "Enter a valid month.");
      result[f.key] = v;
    }
    return result;
  }
  value.job = record("job", input.job);
  if (value.job.zip && !/^\d{5}(?:-\d{4})?$/.test(value.job.zip))
    fail("job.zip", "Enter a US ZIP code.");
  if (value.job.state && !/^[A-Za-z]{2}$/.test(value.job.state))
    fail("job.state", "Use the two-letter state code.");
  value.job.state = value.job.state?.toUpperCase();
  if (
    ["Insurance Claim Estimate", "Supplement"].includes(
      value.job.requestType,
    ) &&
    value.job.insuranceRelated !== "Yes"
  )
    fail(
      "job.insuranceRelated",
      "This request type requires claim information.",
    );
  value.claim = insuranceJob(value) ? record("claim", input.claim) : null;
  value.measurements = record("measurements", input.measurements);
  value.roof = record("roof", input.roof);
  value.exterior = record("exterior", input.exterior);
  value.settings = record("settings", input.settings);
  const ids = new Set();
  for (const [section, max] of [
    ["structures", 12],
    ["components", 40],
    ["damage", 40],
    ["tests", 20],
  ]) {
    const raw = input[section] ?? [];
    if (!Array.isArray(raw) || raw.length > max) {
      fail(section, `Use no more than ${max} items.`);
      value[section] = [];
      continue;
    }
    if (section === "damage" && !insuranceJob(value)) {
      value[section] = [];
      continue;
    }
    if (section === "tests" && !repairRelevant(value)) {
      value[section] = [];
      continue;
    }
    if (
      section === "structures" &&
      value.measurements.source !== "Manual Measurements" &&
      value.measurements.manualOverride !== "Yes"
    ) {
      value[section] = [];
      continue;
    }
    value[section] = raw.map((r, i) => record(section, r, section + "." + i));
    for (const [i, r] of value[section].entries()) {
      if (ids.has(r.id))
        fail(section + "." + i + ".id", "Duplicate item reference.");
      ids.add(r.id);
      if (
        section === "tests" &&
        r.type === "Tile repairability" &&
        !tileRoof(value)
      )
        fail(
          section + "." + i + ".type",
          "Tile repairability applies to a tile roof.",
        );
    }
  }
  value.attachments = [];
  if (!Array.isArray(input.attachments) || input.attachments.length > 60)
    fail("attachments", "Use no more than 60 files.");
  else {
    const attachmentIds = new Set();
    for (const [i, a] of input.attachments.entries()) {
      const key = "attachments." + i;
      if (!object(a)) {
        fail(key, "Invalid file record.");
        continue;
      }
      if (
        Object.keys(a).some(
          (k) =>
            ![
              "id",
              "name",
              "kind",
              "category",
              "notes",
              "relatedItemId",
            ].includes(k),
        )
      )
        fail(key, "Unexpected file field.");
      if (
        typeof a.id !== "string" ||
        !/^f_[a-zA-Z0-9_-]{8,60}$/.test(a.id) ||
        attachmentIds.has(a.id)
      )
        fail(key + ".id", "Invalid or duplicate file reference.");
      attachmentIds.add(a.id);
      if (!categories[a.kind]?.includes(a.category))
        fail(key + ".category", "Choose a valid file category.");
      if (typeof a.name !== "string" || !a.name || a.name.length > 240)
        fail(key + ".name", "Invalid file name.");
      if (a.relatedItemId && !ids.has(a.relatedItemId))
        fail(
          key + ".relatedItemId",
          "File references an inactive or missing item.",
        );
      if (typeof (a.notes ?? "") !== "string" || (a.notes ?? "").length > 1000)
        fail(key + ".notes", "Use shorter file notes.");
      value.attachments.push({
        id: a.id,
        name: a.name,
        kind: a.kind,
        category: a.category,
        notes: a.notes || "",
        relatedItemId: a.relatedItemId || "",
      });
    }
  }
  value.contactConsent = input.contactConsent === true;
  value.evidenceAcknowledged = input.evidenceAcknowledged === true;
  if (!partial && !value.contactConsent)
    fail("contactConsent", "Permission to contact you is required.");
  if (!partial && !value.evidenceAcknowledged)
    fail(
      "evidenceAcknowledged",
      "Confirm the source and limitations of submitted information.",
    );
  return { ok: !Object.keys(errors).length, value, errors };
}
export function missingInformation(data) {
  const issues = [];
  const add = (code, section, message, itemId = "") =>
    issues.push({ code, section, message, itemId });
  const has = (cat) => data.attachments.some((a) => a.category === cat);
  const source = data.measurements.source;
  if (
    [
      "EagleView",
      "GAF QuickMeasure",
      "HOVER",
      "Roofr",
      "Other Measurement Report",
      "Xactimate / ESX",
    ].includes(source) &&
    !has(source === "Xactimate / ESX" ? "ESX" : source)
  )
    add(
      "measurement_report_missing",
      "measurements",
      "Measurement source selected, but the matching report was not attached.",
    );
  if (
    source === "Manual Measurements" &&
    (!data.structures.length ||
      data.structures.some((s) => !s.areaSF && !s.squares))
  )
    add(
      "manual_area_missing",
      "measurements",
      "Manual measurements need structure area or squares.",
    );
  if (
    source === "Not sure" ||
    source === "I Need TriVault to Obtain Measurements"
  )
    add(
      "measurements_review",
      "measurements",
      "Measurement acquisition or source needs review; no order has been placed.",
    );
  if (
    !data.roof.slopeClass ||
    data.roof.slopeClass === "Not sure" ||
    ["steepSystem", "lowSystem"].some(
      (k) => data.roof[k] === "Not sure" || data.roof[k] === "",
    )
  )
    add(
      "roof_material_unknown",
      "roof",
      "Roof system requires estimator review.",
    );
  if (!data.attachments.some((a) => a.category.startsWith("Property Overview")))
    add(
      "overview_photos_missing",
      "files",
      "No property overview photos supplied.",
    );
  if (
    data.claim?.carrierEstimate === "Yes" &&
    !has("Carrier Estimate") &&
    !has("Adjuster Estimate")
  )
    add(
      "carrier_estimate_missing",
      "claim",
      "Carrier / adjuster estimate indicated but not attached.",
    );
  for (const c of data.components) {
    if (c.type === "Skylight" && !c.size)
      add(
        "skylight_size_missing",
        "scope",
        "Skylight size was not provided.",
        c.id,
      );
    if (c.quantity === null)
      add(
        "component_quantity_missing",
        "scope",
        `${c.type}: quantity needs review.`,
        c.id,
      );
  }
  for (const d of data.damage)
    if (d.quantity === null)
      add(
        "damage_quantity_missing",
        "scope",
        "Damage / scope item has no quantity.",
        d.id,
      );
  if (
    data.exterior.guttersIncluded === "Yes" &&
    data.exterior.gutterScope === "Remove & Replace" &&
    !data.exterior.gutterLF
  )
    add(
      "gutter_length_missing",
      "scope",
      "Gutter replacement requested without length.",
    );
  for (const t of data.tests) {
    if (t.performed !== "Yes") continue;
    if (
      !t.performedBy ||
      !t.company ||
      !t.role ||
      !t.date ||
      !t.documentationSource ||
      t.role === "Not provided" ||
      t.documentationSource === "Not provided"
    )
      add(
        "test_provenance_missing",
        "testing",
        "Testing party, role, date or documentation source is incomplete.",
        t.id,
      );
    if (!t.method || !t.location || !t.observations)
      add(
        "test_details_missing",
        "testing",
        "Test method, location or observations need review.",
        t.id,
      );
    if (!data.attachments.some((a) => a.relatedItemId === t.id))
      add(
        "test_evidence_missing",
        "testing",
        "No evidence file linked to this test.",
        t.id,
      );
    if (t.result === "Fail")
      add(
        "test_result_review",
        "testing",
        "Reported Fail requires estimator analysis; it does not determine replacement scope.",
        t.id,
      );
  }
  return issues;
}
