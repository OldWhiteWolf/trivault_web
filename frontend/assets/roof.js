import {
  definitions,
  SCHEMA_VERSION,
  categories,
  visible,
  insuranceJob,
  repairRelevant,
  tileRoof,
  validateRoof,
  missingInformation,
} from "./roof-schema.mjs";
import { prepareForm, message } from "./forms.js";
const form = document.querySelector("#roof-form"),
  panel = document.querySelector("#roof-step"),
  errors = document.querySelector("#roof-errors");
const state = {
  schemaVersion: SCHEMA_VERSION,
  job: { state: "FL" },
  claim: {},
  measurements: { manualOverride: "No" },
  roof: { slopeClass: "Not sure" },
  exterior: {
    guttersIncluded: "No",
    fasciaIncluded: "No",
    soffitIncluded: "No",
  },
  settings: {
    platform: "Let estimator determine",
    priceList: "Let Estimator Determine",
    overheadProfit: "Let estimator review",
    hvhz: "Unknown",
  },
  structures: [],
  components: [],
  damage: [],
  tests: [],
  attachments: [],
  contactConsent: false,
  evidenceAcknowledged: false,
};
let index = 0,
  files = new Map(),
  previews = new Map(),
  controller;
const stepDefinitions = [
  ["job", "Job information", ["job"]],
  ["claim", "Claim information", ["claim"]],
  ["measurements", "Measurements", ["measurements", "structures"]],
  ["roof", "Roofing system", ["roof"]],
  ["scope", "Components & scope", ["components", "damage", "exterior"]],
  ["testing", "Repairability & field testing", ["tests"]],
  ["files", "Photos & documents", ["attachments"]],
  ["settings", "Estimate settings", ["settings"]],
  ["review", "Review & submit", []],
];
const steps = () =>
  stepDefinitions.filter(
    ([id]) =>
      (id !== "claim" || insuranceJob(state)) &&
      (id !== "testing" || repairRelevant(state)),
  );
const uid = (prefix) => prefix + "_" + crypto.randomUUID();
function node(tag, text = "", attrs = {}) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "hidden") el.hidden = v;
    else el.setAttribute(k, String(v));
  }
  return el;
}
function note(text) {
  return node("p", text, { class: "small muted" });
}
function defaults(section) {
  return Object.fromEntries(
    definitions[section]
      .filter((f) => f.default !== undefined)
      .map((f) => [f.key, f.default]),
  );
}
function fieldGrid(section, record, path = section, subset) {
  const wrap = node("div", "", { class: "fields" }),
    elements = [];
  for (const f of definitions[section].filter(
    (f) => !subset || subset.includes(f.key),
  )) {
    const id = path.replaceAll(".", "-") + "-" + f.key,
      box = node("div", "", {
        class:
          "field " +
          (f.type === "textarea" || f.type === "multi" ? "full" : ""),
      });
    let label = node("label", f.label + (f.required ? " *" : ""), { for: id });
    box.append(label);
    let control;
    if (f.type === "multi") {
      control = node("div", "", { class: "roof-checks", id });
      for (const option of f.options) {
        const line = node("label"),
          c = node("input", "", { type: "checkbox", value: option });
        c.checked = (record[f.key] || []).includes(option);
        c.addEventListener("change", () => {
          record[f.key] = [...control.querySelectorAll("input:checked")].map(
            (x) => x.value,
          );
          changed(f.key);
        });
        line.append(c, node("span", option));
        control.append(line);
      }
    } else if (f.type === "select") {
      control = node("select", "", { id });
      control.append(
        new Option(f.required ? "Choose an option" : "Not provided", ""),
      );
      for (const option of f.options) {
        if (
          section === "tests" &&
          f.key === "type" &&
          option === "Tile repairability" &&
          !tileRoof(state)
        )
          continue;
        control.add(new Option(option, option));
      }
      control.value = record[f.key] ?? f.default ?? "";
      if (record[f.key] === undefined && f.default !== undefined)
        record[f.key] = f.default;
    } else {
      control = node(f.type === "textarea" ? "textarea" : "input", "", { id });
      if (f.type !== "textarea") control.type = f.type;
      else control.rows = 3;
      control.value = record[f.key] ?? f.default ?? "";
      if (f.max && f.type !== "number") control.maxLength = f.max;
      if (f.type === "number") {
        control.min = f.min ?? 0;
        control.max = f.max;
        control.step = f.integer ? "1" : "any";
      }
      if (f.autocomplete) control.autocomplete = f.autocomplete;
    }
    control.dataset.field = path + "." + f.key;
    control.required = !!f.required;
    box.append(control);
    wrap.append(box);
    elements.push({ f, box, control });
    if (f.type !== "multi") {
      control.addEventListener(f.type === "select" ? "change" : "input", () => {
        record[f.key] =
          f.type === "number"
            ? control.value === ""
              ? null
              : Number(control.value)
            : control.value;
        control.removeAttribute("aria-invalid");
        changed(f.key);
      });
    }
  }
  function sync() {
    for (const { f, box, control } of elements) {
      const active =
        visible(f, record) &&
        (section !== "tests" ||
          record.performed === "Yes" ||
          ["type", "performed", "notes"].includes(f.key));
      box.hidden = !active;
      control.disabled = !active;
      if (f.type === "multi")
        box.querySelectorAll("input").forEach((e) => (e.disabled = !active));
    }
  }
  function changed(key) {
    sync();
    if (
      section === "job" &&
      key === "requestType" &&
      ["Insurance Claim Estimate", "Supplement"].includes(record.requestType)
    ) {
      record.insuranceRelated = "Yes";
      wrap.querySelector('[data-field="job.insuranceRelated"]').value = "Yes";
    }
    if (section === "job") nav();
    if (
      section === "measurements" &&
      ["source", "manualOverride"].includes(key)
    )
      render();
    if (section === "roof" && ["slopeClass", "steepSystem"].includes(key))
      nav();
  }
  sync();
  return wrap;
}
function repeatSection(section, title, description) {
  const container = node("section", "", { class: "roof-repeat" });
  container.append(node("h3", title));
  if (description) container.append(note(description));
  const list = node("div");
  container.append(list);
  for (const [i, record] of state[section].entries()) {
    const card = node("fieldset", "", { class: "roof-item" });
    card.append(node("legend", `${title.replace(/s$/, "")} ${i + 1}`));
    const remove = node("button", "Remove", {
      type: "button",
      class: "remove-item",
      "aria-label": `Remove ${title} ${i + 1}`,
    });
    remove.addEventListener("click", () => {
      state[section].splice(i, 1);
      for (const a of state.attachments)
        if (a.relatedItemId === record.id) a.relatedItemId = "";
      render();
    });
    card.append(remove);
    card.append(fieldGrid(section, record, section + "." + i));
    if (section === "tests") {
      const review = node("div", "", { class: "assessment-note" });
      review.append(
        node("strong", "Estimator Assessment"),
        node(
          "p",
          "No determination — completed separately by TriVault after reviewing the evidence.",
        ),
        note(
          "A reported Fail is evidence, not an automatic full roof replacement. Public submissions cannot set TriVault’s assessment.",
        ),
      );
      card.append(review);
    }
    list.append(card);
  }
  const max = { structures: 12, components: 40, damage: 40, tests: 20 }[
    section
  ];
  const add = node(
    "button",
    "+ Add " +
      {
        structures: "Structure",
        components: "Component",
        damage: "Damage / Scope Item",
        tests: "Test",
      }[section],
    { type: "button", class: "button outline" },
  );
  add.disabled = state[section].length >= max;
  add.addEventListener("click", () => {
    state[section].push({ id: uid("r"), ...defaults(section) });
    render();
    const cards = panel.querySelectorAll(".roof-item");
    cards[cards.length - 1]?.querySelector("select,input")?.focus();
  });
  container.append(add);
  return container;
}
function nav() {
  const active = steps();
  if (index >= active.length) index = active.length - 1;
  const list = document.querySelector("#wizard-steps");
  list.replaceChildren();
  active.forEach(([key, title], i) => {
    const b = node("button", `${String(i + 1).padStart(2, "0")}  ${title}`, {
      type: "button",
      "aria-current": i === index ? "step" : "false",
    });
    b.addEventListener("click", () => {
      index = i;
      render();
      panel.querySelector("h2")?.focus();
    });
    list.append(b);
  });
  document.querySelector("#step-count").textContent =
    `Step ${index + 1} of ${active.length}`;
  document.querySelector("#step-label").textContent = active[index][1];
  const progress = document.querySelector("#roof-progress");
  progress.max = active.length;
  progress.value = index + 1;
}
function snapshot() {
  const data = structuredClone(state);
  data.attachments = data.attachments.map((a) => ({ ...a }));
  const result = validateRoof(data, { partial: true });
  return result.value || data;
}
function render() {
  nav();
  const [key, title] = steps()[index];
  panel.replaceChildren(node("h2", title, { tabindex: "-1" }));
  errors.hidden = true;
  document.querySelector("#roof-security").hidden = key !== "review";
  document.querySelector("#roof-back").hidden = index === 0;
  document.querySelector("#roof-next").hidden = key === "review";
  form.querySelector("[type=submit]").hidden = key !== "review";
  if (key === "job") {
    panel.append(
      note(
        "Only fields marked * are required. Technical details can be marked unknown or added later.",
      ),
      fieldGrid("job", state.job),
    );
  }
  if (key === "claim") {
    panel.append(
      note(
        "Share what is available. Estimates and claim documents can be attached in Photos & documents.",
      ),
      fieldGrid("claim", state.claim),
    );
  }
  if (key === "measurements") {
    panel.append(
      note(
        "Have a measurement report? Upload it in the file step. You do not need to type its measurements again.",
      ),
      fieldGrid("measurements", state.measurements),
    );
    if (
      state.measurements.source === "Manual Measurements" ||
      state.measurements.manualOverride === "Yes"
    )
      panel.append(
        repeatSection(
          "structures",
          "Structures",
          "Add the buildings you need estimated. Unknown dimensions may remain blank; they will be flagged for review.",
        ),
      );
    else if (
      state.measurements.source === "I Need TriVault to Obtain Measurements"
    )
      panel.append(
        note(
          "This is a request to discuss measurement acquisition. No report is ordered or charged automatically.",
        ),
      );
  }
  if (key === "roof") {
    panel.append(
      note(
        "Choose the roofing system if known. Leave technical details blank when they need estimator review.",
      ),
      fieldGrid("roof", state.roof, "roof", [
        "slopeClass",
        "steepSystem",
        "lowSystem",
        "systemOther",
      ]),
    );
    const details = node("details", "", { class: "optional-details" });
    details.append(
      node("summary", "Add layers, deck and permit details (optional)"),
      fieldGrid(
        "roof",
        state.roof,
        "roof",
        definitions.roof
          .map((f) => f.key)
          .filter(
            (k) =>
              ![
                "slopeClass",
                "steepSystem",
                "lowSystem",
                "systemOther",
              ].includes(k),
          ),
      ),
    );
    panel.append(details);
  }
  if (key === "scope") {
    panel.append(
      repeatSection(
        "components",
        "Components",
        "Add only components relevant to the requested work. Quantities and requested scope are not a final estimate.",
      ),
      node("h3", "Gutters, fascia & soffit"),
      fieldGrid("exterior", state.exterior),
    );
    if (insuranceJob(state))
      panel.append(
        repeatSection(
          "damage",
          "Damage / Scope Items",
          "Location → Condition → Requested scope → Quantity → Evidence. Link files to an item in the upload step.",
        ),
      );
  }
  if (key === "testing") {
    panel.append(
      note(
        "Optional. Record existing field-test evidence supplied by the testing party. You do not need to perform a new test to complete this intake.",
      ),
      node(
        "div",
        "Test → Method → Location → Observation → Result → Evidence → Estimator Assessment",
        { class: "evidence-flow" },
      ),
      note(
        "Identify who performed each test and when. Submission of a third-party report does not mean TriVault performed the test. Photos and video can be linked to individual tests in the next step.",
      ),
      repeatSection("tests", "Tests"),
    );
  }
  if (key === "files") renderFiles();
  if (key === "settings") {
    panel.append(
      note(
        "These are instructions for review, not entitlements or code determinations. O&P is never added automatically.",
      ),
      fieldGrid("settings", state.settings),
    );
  }
  if (key === "review") {
    renderReview();
    controller
      ?.activateChallenge()
      .catch((e) => message(form, e.message, true));
  }
}
function selectCategories(select, kind, current) {
  select.replaceChildren();
  for (const category of categories[kind])
    select.add(new Option(category, category));
  select.value = categories[kind].includes(current)
    ? current
    : categories[kind][0];
}
function renderFiles() {
  panel.append(
    note(
      "Categorize each file and link evidence to a component, damage item or field test when applicable. Up to 60 files, 50 MB each, 200 MB total. MP4/MOV video and ESX are accepted for review; no Xactimate import is performed.",
    ),
  );
  for (const [kind, title, accept] of [
    ["photo", "Guided photos", ".jpg,.jpeg,.png,.heic,.webp"],
    ["document", "Supporting documents", ".pdf,.doc,.docx,.xls,.xlsx,.esx"],
    ["video", "Test / damage video", ".mp4,.mov"],
  ]) {
    const block = node("section", "", { class: "roof-upload-zone" });
    block.append(node("h3", title));
    const category = node("select", "", { "aria-label": `${title} category` });
    selectCategories(category, kind, "");
    const picker = node("input", "", {
      type: "file",
      multiple: "",
      accept,
      "aria-label": `Add ${title.toLowerCase()}`,
    });
    picker.addEventListener("change", () => {
      addFiles([...picker.files], kind, category.value);
      picker.value = "";
    });
    block.append(category, picker);
    if (kind === "photo")
      block.append(
        note(
          "Overview: front, rear, left and right. Roof: each slope. Damage: wide, medium and close-up. Add interior / leak evidence if relevant.",
        ),
      );
    panel.append(block);
  }
  const summary = node(
    "p",
    `${state.attachments.length} files selected · ${(Array.from(files.values()).reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1)} MB`,
    { class: "small" },
  );
  panel.append(summary);
  const list = node("div", "", { class: "roof-files" });
  state.attachments.forEach((a) => {
    const card = node("article", "", { class: "roof-file" }),
      file = files.get(a.id);
    if (a.kind === "photo" && file && /\.(jpe?g|png|webp)$/i.test(a.name)) {
      if (!previews.has(a.id)) previews.set(a.id, URL.createObjectURL(file));
      card.append(
        node("img", "", {
          src: previews.get(a.id),
          alt: a.name,
          width: 100,
          height: 80,
        }),
      );
    }
    card.append(
      node("strong", a.name),
      note(
        file
          ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
          : "File must be selected again before submission.",
      ),
    );
    const cat = node("select", "", { "aria-label": `Category for ${a.name}` });
    selectCategories(cat, a.kind, a.category);
    cat.addEventListener("change", () => (a.category = cat.value));
    card.append(cat);
    const relation = node("select", "", {
      "aria-label": `Link evidence for ${a.name}`,
    });
    relation.add(new Option("No specific item", ""));
    for (const group of ["components", "damage", "tests"])
      for (const [i, r] of snapshot()[group].entries())
        relation.add(
          new Option(
            `${group === "tests" ? "Test" : group === "damage" ? "Damage" : "Component"} ${i + 1}: ${r.type || r.location || "Item"}`,
            r.id,
          ),
        );
    relation.value = a.relatedItemId;
    relation.addEventListener(
      "change",
      () => (a.relatedItemId = relation.value),
    );
    card.append(relation);
    const caption = node("input", "", {
      type: "text",
      maxlength: 1000,
      "aria-label": `Notes for ${a.name}`,
      placeholder: "File notes (optional)",
    });
    caption.value = a.notes;
    caption.addEventListener("input", () => (a.notes = caption.value));
    card.append(caption);
    const replacement = node("input", "", {
      type: "file",
      "aria-label": `Replace ${a.name}`,
      accept:
        a.kind === "photo"
          ? ".jpg,.jpeg,.png,.heic,.webp"
          : a.kind === "video"
            ? ".mp4,.mov"
            : ".pdf,.doc,.docx,.xls,.xlsx,.esx",
    });
    replacement.addEventListener("change", () => {
      const selected = replacement.files[0];
      if (!selected) return;
      if (!validFiles([selected], a.id)) return;
      const kind = /\.(jpe?g|png|heic|webp)$/i.test(selected.name)
        ? "photo"
        : /\.(mp4|mov)$/i.test(selected.name)
          ? "video"
          : "document";
      if (kind !== a.kind) {
        showError(
          "Replace with the same file category, or remove this file and use the appropriate upload section.",
        );
        return;
      }
      revoke(a.id);
      a.name = selected.name;
      files.set(a.id, selected);
      render();
    });
    card.append(replacement);
    const remove = node("button", "Remove file", {
      type: "button",
      class: "text-link",
    });
    remove.addEventListener("click", () => {
      state.attachments = state.attachments.filter((x) => x.id !== a.id);
      files.delete(a.id);
      revoke(a.id);
      render();
    });
    card.append(remove);
    list.append(card);
  });
  panel.append(list);
}
function revoke(id) {
  if (previews.has(id)) URL.revokeObjectURL(previews.get(id));
  previews.delete(id);
}
function validFiles(selected, replacing) {
  let error = "";
  if (state.attachments.length + selected.length - (replacing ? 1 : 0) > 60)
    error = "Select no more than 60 files.";
  if (selected.some((f) => !f.size || f.size > 50 * 1024 * 1024))
    error = "Each file must be nonempty and 50 MB or smaller.";
  const existing = [...files]
    .filter(([id]) => id !== replacing)
    .reduce((n, [, f]) => n + f.size, 0);
  if (existing + selected.reduce((n, f) => n + f.size, 0) > 200 * 1024 * 1024)
    error = "The complete upload must be 200 MB or less.";
  if (
    selected.some(
      (f) =>
        !/^.+\.(pdf|jpe?g|png|heic|webp|docx?|xlsx?|esx|mp4|mov)$/i.test(
          f.name,
        ),
    )
  )
    error = "Unsupported file format.";
  if (error) {
    showError(error);
    return false;
  }
  return true;
}
function addFiles(selected, kind, category) {
  if (!validFiles(selected)) return;
  for (const file of selected) {
    const actual = /\.(jpe?g|png|heic|webp)$/i.test(file.name)
      ? "photo"
      : /\.(mp4|mov)$/i.test(file.name)
        ? "video"
        : "document";
    if (actual !== kind) {
      showError("Choose the correct upload section for this file type.");
      return;
    }
  }
  for (const file of selected) {
    const id = uid("f");
    state.attachments.push({
      id,
      name: file.name,
      kind,
      category,
      notes: "",
      relatedItemId: "",
    });
    files.set(id, file);
  }
  render();
}
function renderReview() {
  const data = snapshot(),
    warnings = missingInformation(data);
  panel.append(
    note(
      "Review the details before submitting. Recommended information can follow later; missing required contact fields must be completed.",
    ),
    node(
      "div",
      `${data.attachments.filter((a) => a.kind === "photo").length} photos · ${data.attachments.filter((a) => a.kind === "document").length} documents · ${data.attachments.filter((a) => a.kind === "video").length} videos · ${data.components.length} components · ${data.structures.length} structures`,
      { class: "review-counts" },
    ),
  );
  for (const [key, label, sections] of steps().filter(
    (s) => s[0] !== "review",
  )) {
    const detail = node("details", "", { class: "review-section" });
    detail.append(node("summary", label));
    for (const section of sections) {
      const value = data[section];
      if (Array.isArray(value)) {
        if (!value.length) detail.append(note("No items supplied."));
        for (const row of value) {
          const dl = node("dl");
          for (const [k, v] of Object.entries(row)) {
            if (k === "id" || !v) continue;
            dl.append(
              node(
                "dt",
                definitions[section]?.find((f) => f.key === k)?.label || k,
              ),
              node("dd", Array.isArray(v) ? v.join(", ") : String(v)),
            );
          }
          detail.append(dl);
        }
      } else if (value) {
        const dl = node("dl");
        for (const [k, v] of Object.entries(value)) {
          if (v === null || v === "" || (Array.isArray(v) && !v.length))
            continue;
          dl.append(
            node(
              "dt",
              definitions[section]?.find((f) => f.key === k)?.label || k,
            ),
            node("dd", Array.isArray(v) ? v.join(", ") : String(v)),
          );
        }
        detail.append(dl);
      }
    }
    const edit = node("button", "Edit " + label, {
      type: "button",
      class: "text-link",
    });
    edit.addEventListener("click", () => {
      index = steps().findIndex((s) => s[0] === key);
      render();
      panel.querySelector("h2").focus();
    });
    detail.append(edit);
    panel.append(detail);
  }
  if (warnings.length) {
    const box = node("section", "", { class: "missing-review" });
    box.append(node("h3", "Recommended for estimator review"));
    const ul = node("ul");
    warnings.forEach((w) => ul.append(node("li", w.message)));
    box.append(
      ul,
      note(
        "These reminders do not automatically block submission or determine a repair/replacement scope.",
      ),
    );
    panel.append(box);
  }
  for (const [key, label] of [
    [
      "evidenceAcknowledged",
      "I am authorized to share these files. Testing records describe evidence supplied by the named testing party; they do not state that TriVault performed the tests. A reported result does not determine the final scope.",
    ],
    [
      "contactConsent",
      "I authorize TriVault to contact me about this estimate request and send a receipt to the email provided. I have read the privacy notice. This does not authorize a charge or confirm a scope.",
    ],
  ]) {
    const line = node("label", "", { class: "check" }),
      checkbox = node("input", "", {
        type: "checkbox",
        name: key,
        required: "",
      });
    checkbox.checked = state[key];
    checkbox.addEventListener("change", () => (state[key] = checkbox.checked));
    line.append(checkbox, node("span", label));
    panel.append(line);
  }
  panel.append(
    node("a", "Read the privacy notice", {
      href: "/privacy/",
      target: "_blank",
      rel: "noopener",
      class: "small",
    }),
  );
}
function showError(text) {
  errors.textContent = text;
  errors.hidden = false;
  errors.focus();
}
function showValidation(result, only) {
  const entries = Object.entries(result.errors).filter(
    ([key]) => !only || only.some((s) => key === s || key.startsWith(s + ".")),
  );
  if (!entries.length) return true;
  showError(entries.map(([key, msg]) => `${key}: ${msg}`).join(" "));
  for (const [key] of entries) {
    const control = [...panel.querySelectorAll("[data-field]")].find(
      (e) => e.dataset.field === key,
    );
    if (control) {
      control.setAttribute("aria-invalid", "true");
      const details = control.closest("details");
      if (details) details.open = true;
    }
  }
  return false;
}
document.querySelector("#roof-next").addEventListener("click", () => {
  const result = validateRoof(state);
  if (!showValidation(result, steps()[index][2])) return;
  index++;
  render();
  panel.querySelector("h2").focus();
});
document.querySelector("#roof-back").addEventListener("click", () => {
  index = Math.max(0, index - 1);
  render();
  panel.querySelector("h2").focus();
});
document.querySelector("#save-draft").addEventListener("click", () => {
  const blob = new Blob(
      [
        JSON.stringify(
          { format: "TriVault roof draft", version: 1, intake: snapshot() },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    url = URL.createObjectURL(blob),
    a = node("a", "", { href: url, download: "TriVault-roof-draft.json" });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document
  .querySelector("#restore-draft")
  .addEventListener("change", async (e) => {
    try {
      const file = e.target.files[0];
      if (!file || file.size > 512 * 1024)
        throw Error("Select a roof draft smaller than 512 KB.");
      const draft = JSON.parse(await file.text());
      if (draft.format !== "TriVault roof draft" || draft.version !== 1)
        throw Error("This is not a supported TriVault draft.");
      const checked = validateRoof(draft.intake, { partial: true });
      if (!checked.ok)
        throw Error("The draft contains unsupported or invalid data.");
      for (const id of previews.keys()) revoke(id);
      files.clear();
      Object.assign(state, checked.value);
      state.claim ??= {};
      state.contactConsent = false;
      state.evidenceAcknowledged = false;
      index = 0;
      render();
      showError(
        "Draft restored. Re-select each attachment in the file step and review your contact permissions before submitting.",
      );
    } catch (error) {
      showError(error.message);
    }
    e.target.value = "";
  });
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (steps()[index][0] !== "review") {
    document.querySelector("#roof-next").click();
    return;
  }
  if (!controller) return;
  const result = validateRoof(state);
  if (!result.ok) {
    const first = Object.keys(result.errors)[0].split(".")[0];
    const target = steps().findIndex((s) => s[2].includes(first));
    if (target >= 0) index = target;
    render();
    showValidation(result);
    return;
  }
  if (state.attachments.some((a) => !files.has(a.id))) {
    index = steps().findIndex((s) => s[0] === "files");
    render();
    showError("Please re-select or remove the missing draft attachments.");
    return;
  }
  const body = new FormData();
  body.set("intake", JSON.stringify(result.value));
  body.set("website", form.elements.website.value);
  for (const a of state.attachments) {
    const ext = a.name.slice(a.name.lastIndexOf(".")).toLowerCase();
    body.append("documents", files.get(a.id), a.id + ext);
  }
  await controller.send("/api/intake/roof-estimate", body);
  if (form.querySelector("[type=submit]").textContent === "Request received") {
    document
      .querySelectorAll("#wizard-steps button,#save-draft,#restore-draft")
      .forEach((el) => (el.disabled = true));
  }
});
render();
controller = await prepareForm(form, { deferChallenge: true });
