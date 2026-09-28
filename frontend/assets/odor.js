import { prepareForm, message } from "./forms.js";
import { validateOdorLead } from "./odor-schema.mjs";
const form = document.querySelector("#odor-form");
const company = form.elements.company;
function role() {
  const business = form.elements.audience.value === "business";
  company.required = business;
  company.closest(".field").hidden = !business;
  company.disabled = !business;
}
form
  .querySelectorAll("[name=audience]")
  .forEach((r) => r.addEventListener("change", role));
role();
const controller = await prepareForm(form);
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!controller || !form.reportValidity()) return;
  const input = Object.fromEntries(new FormData(form));
  input.contactConsent = form.elements.contactConsent.checked;
  const website = input.website;
  delete input.website;
  delete input["cf-turnstile-response"];
  const result = validateOdorLead(input);
  if (!result.ok) {
    message(form, Object.values(result.errors).join(". "), true).focus();
    return;
  }
  await controller.send(
    "/api/v1/odor/leads",
    { ...result.value, website },
    { json: true },
  );
});
