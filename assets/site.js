import { offline } from "./deployment.js";
export { offline };
const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#primary-nav");
toggle?.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", String(open));
  nav.classList.toggle("open", open);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && toggle?.getAttribute("aria-expanded") === "true") {
    toggle.click();
    toggle.focus();
  }
});
nav?.addEventListener("click", (e) => {
  if (e.target.closest("a") && toggle.getAttribute("aria-expanded") === "true")
    toggle.click();
});
if (location.pathname === "/" || location.pathname === "/index.html") {
  if (
    ["#intake", "#pricing", "#samples", "#estimate-form"].includes(
      location.hash,
    )
  )
    location.replace("/estimates/#intake");
}
export const configuration = offline
  ? Promise.resolve({ mode: "static", turnstileSiteKey: "" })
  : fetch("/api/config", { cache: "no-store" })
      .then((r) => {
        if (!r.ok)
          throw Error(
            "Unable to load secure form settings. Please call TriVault.",
          );
        return r.json();
      })
      .then((config) => {
        const note = document.querySelector(".local-notice");
        if (note) note.hidden = config.mode !== "development";
        return config;
      });
configuration.catch(() => {});
