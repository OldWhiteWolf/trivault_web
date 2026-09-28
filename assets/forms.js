import { configuration, offline } from "./site.js";
export function message(form, text, error = false) {
  const status =
    form.querySelector(".submission-status") || form.querySelector(".status");
  status.textContent = text;
  status.classList.toggle("error", error);
  return status;
}
let challengeScript;
async function loadChallenge() {
  if (window.turnstile) return;
  challengeScript ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = resolve;
    s.onerror = () =>
      reject(Error("The security check could not load. Please call TriVault."));
    document.head.append(s);
  });
  await challengeScript;
}
export async function prepareForm(form, { deferChallenge = false } = {}) {
  if (offline) {
    const notice =
      "Online submission is not available yet. Nothing has been sent. Please call (786) 879-1056 or email TriVault@FloridaParamount.com.";
    const submit = form.querySelector("[type=submit]");
    submit.disabled = false;
    const hint = document.createElement("p");
    hint.className = "small muted";
    hint.textContent =
      "Online submission is not available yet. For assistance, contact TriVault directly.";
    form.prepend(hint);
    form.addEventListener(
      "submit",
      (event) => {
        // Roof wizard uses Enter for Continue until the review step.
        if (form.id === "roof-form" && submit.hidden) return;
        if (form.elements.serviceType?.value === "Virtual Roof Estimate")
          return;
        event.preventDefault();
        event.stopImmediatePropagation();
        message(form, notice).focus();
      },
      true,
    );
    return {
      activateChallenge: async () => {},
      send: async () => message(form, notice).focus(),
    };
  }
  let token = "",
    widget,
    key = crypto.randomUUID(),
    busy = false,
    finished = false;
  const submit = form.querySelector("[type=submit]");
  let config;
  async function activateChallenge() {
    if (!config?.turnstileSiteKey || widget !== undefined) return;
    await loadChallenge();
    widget = window.turnstile.render(form.querySelector(".security-check"), {
      sitekey: config.turnstileSiteKey,
      action: "intake",
      callback: (value) => {
        token = value;
      },
      "expired-callback": () => {
        token = "";
      },
      "error-callback": () => {
        token = "";
        message(
          form,
          "Security check unavailable. Please retry or call TriVault.",
          true,
        );
      },
    });
  }
  try {
    config = await configuration;
    if (config.turnstileSiteKey) {
      if (!deferChallenge) await activateChallenge();
    } else if (config.mode === "production")
      throw Error(
        "Secure form configuration is unavailable. Please call TriVault.",
      );
    submit.disabled = false;
  } catch (e) {
    message(form, e.message, true);
    return null;
  }
  form.addEventListener("input", () => {
    if (!busy && !finished) key = crypto.randomUUID();
  });
  return {
    activateChallenge,
    async send(url, body, { json = false } = {}) {
      if (busy || finished) return;
      busy = true;
      submit.disabled = true;
      submit.textContent = "Sending…";
      message(form, "Sending your request. Please keep this page open.");
      try {
        await activateChallenge();
        if (widget !== undefined && !token)
          throw Error("Please complete the security check.");
        if (json) body["cf-turnstile-response"] = token;
        else body.set("cf-turnstile-response", token);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Idempotency-Key": key,
            ...(json ? { "Content-Type": "application/json" } : {}),
          },
          body: json ? JSON.stringify(body) : body,
          signal: AbortSignal.timeout(180000),
        });
        let result;
        try {
          result = await response.json();
        } catch {
          throw Error(
            "The server response was interrupted. Your request may have been received. Retry without changing the form, or call TriVault.",
          );
        }
        if (!response.ok) {
          if (result.fields) {
            for (const [name, text] of Object.entries(result.fields)) {
              const field = form.elements.namedItem(name);
              if (field instanceof HTMLElement) {
                field.setAttribute("aria-invalid", "true");
                field.addEventListener(
                  "input",
                  () => field.removeAttribute("aria-invalid"),
                  { once: true },
                );
              }
            }
          }
          throw Error(
            result.error ||
              "Unable to send your request. Please call TriVault.",
          );
        }
        finished = true;
        message(
          form,
          `Request received. ${result.jobId ? "Job ID" : "Reference"}: ${result.jobId || result.requestId}. We’ll review the details with you.${form.id === "estimate-form" ? " Your requested appointment is not confirmed yet." : ""}`,
        ).focus();
        submit.textContent = "Request received";
        for (const el of form.elements) el.disabled = true;
        if (result.receiptToken) pollStatus(form, result);
      } catch (e) {
        message(
          form,
          e.name === "TimeoutError" || e.name === "TypeError"
            ? "Connection interrupted. Your request may have been received. Retry without changing the form, or call TriVault."
            : e.message,
          true,
        ).focus();
        submit.disabled = false;
        submit.textContent = "Retry request";
      } finally {
        busy = false;
        if (widget !== undefined && !finished) {
          window.turnstile.reset(widget);
          token = "";
        }
      }
    },
  };
}
async function pollStatus(form, receipt) {
  for (let i = 0; i < 6; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    try {
      const response = await fetch(
        `/api/v1/requests/${encodeURIComponent(receipt.requestId)}/status`,
        {
          headers: { "X-Receipt-Token": receipt.receiptToken },
          cache: "no-store",
        },
      );
      if (!response.ok) return;
      const result = await response.json();
      if (result.status === "complete") {
        message(
          form,
          `Request recorded. Reference: ${receipt.jobId || receipt.requestId}. ${result.appointmentConfirmed ? "Your selected field visit has been placed on the calendar. Contact us if access details change." : "Our team will review the scope and contact you."}`,
        );
        return;
      }
      if (result.status === "needs_review") {
        message(
          form,
          `Your request is saved and needs team review. Reference: ${receipt.jobId || receipt.requestId}. Please call (786) 879-1056 with this reference to follow up. Do not submit another request for the same project.`,
        );
        return;
      }
    } catch {
      return;
    }
  }
}
