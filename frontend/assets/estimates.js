import { prepareForm, message } from "./forms.js";
import { offline } from "./site.js";
const form = document.querySelector("#estimate-form"),
  virtualRoof = document.querySelector("#virtual-roof-route"),
  fieldRequestFields = document.querySelector("#field-request-fields"),
  fieldSupportingFiles = document.querySelector("#field-supporting-files"),
  fieldConsent = document.querySelector("#field-consent"),
  scheduling = document.querySelector("#scheduling"),
  day = document.querySelector("#visitDay"),
  slot = document.querySelector("#visitSlot"),
  availability = document.querySelector("#availability-status"),
  files = form.elements.documents;
let request,
  revision = 0;
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
day.min = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(tomorrow);
function clearSlots(text = "Choose a date first") {
  slot.replaceChildren(new Option(text, ""));
  slot.disabled = true;
}
function mode() {
  const virtual = form.elements.serviceType.value === "Virtual Roof Estimate";
  const physical = form.elements.serviceType.value && !virtual;
  virtualRoof.hidden = !virtual;
  fieldRequestFields.hidden = !physical;
  fieldSupportingFiles.hidden = !physical;
  fieldConsent.hidden = !physical;
  for (const element of fieldRequestFields.querySelectorAll(
    "input, select, textarea",
  ))
    element.disabled = !physical;
  files.disabled = !physical;
  for (const element of fieldConsent.querySelectorAll("input, button"))
    element.disabled = !physical;
  scheduling.hidden = !physical;
  scheduling.disabled = !physical;
  day.disabled = offline;
  if (offline && physical) {
    clearSlots("Scheduling opens when online intake is activated");
    availability.textContent =
      "Online scheduling is not available yet. Call TriVault to discuss your project.";
  }
  if (!physical) {
    request?.abort();
    revision++;
    day.value = "";
    clearSlots();
    availability.textContent = "";
  }
}
form.elements.serviceType.addEventListener("change", mode);
mode();
day.addEventListener("change", async () => {
  if (offline) return;
  request?.abort();
  request = new AbortController();
  const version = ++revision;
  clearSlots("Loading…");
  availability.textContent = "Checking available times…";
  if (!day.value) {
    clearSlots();
    availability.textContent = "";
    return;
  }
  try {
    const response = await fetch(
      `/availability?date=${encodeURIComponent(day.value)}`,
      { signal: request.signal, cache: "no-store" },
    );
    const result = await response.json();
    if (version !== revision) return;
    if (!response.ok)
      throw Error(
        result.error || "Scheduling is unavailable. Please call TriVault.",
      );
    clearSlots("Select a time");
    for (const entry of result.slots) {
      const label = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(entry.startISO));
      slot.add(new Option(label, entry.startISO));
    }
    slot.disabled = !result.slots.length;
    availability.textContent = result.slots.length
      ? "Select a proposed start time. Confirmation follows review."
      : "No available times for this date. Try another weekday or call us.";
  } catch (e) {
    if (e.name === "AbortError" || version !== revision) return;
    clearSlots("Unavailable");
    availability.textContent = e.message;
  }
});
files.addEventListener("change", () => {
  const list = document.querySelector("#file-list");
  list.replaceChildren();
  const selected = [...files.files];
  let error = "";
  if (selected.length > 10) error = "Choose no more than 10 files.";
  if (selected.some((f) => f.size > 50 * 1024 * 1024))
    error = "Each file must be 50 MB or smaller.";
  if (selected.reduce((n, f) => n + f.size, 0) > 100 * 1024 * 1024)
    error = "Files must total 100 MB or less.";
  if (
    selected.some(
      (f) =>
        !f.size || !/^.+\.(pdf|jpe?g|png|webp|heic|docx?|xlsx?)$/i.test(f.name),
    )
  )
    error = "Choose nonempty files in a supported format.";
  files.setCustomValidity(error);
  for (const file of selected) {
    const item = document.createElement("p");
    item.className = "file-chip";
    item.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
    list.append(item);
  }
  if (error) message(form, error, true);
});
const controller = await prepareForm(form);
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (form.elements.serviceType.value === "Virtual Roof Estimate") {
    window.location.assign("/estimates/roof/");
    return;
  }
  if (!controller || !form.reportValidity()) return;
  const physical = true;
  if (physical && !slot.value) {
    message(
      form,
      "Select an available field visit time, or contact TriVault for scheduling.",
      true,
    ).focus();
    return;
  }
  const data = new FormData(form);
  if (!files.files.length) data.delete("documents");
  data.set("date", physical ? slot.value : new Date().toISOString());
  data.set("isSubmissionTimestamp", String(!physical));
  data.set("contactConsent", String(form.elements.contactConsent.checked));
  await controller.send("/submit", data);
});
