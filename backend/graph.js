import fetch from "node-fetch";
import { ConfidentialClientApplication } from "@azure/msal-node";

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`
  }
});

async function getToken() {
  const res = await cca.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"]
  });
  return res.accessToken;
}

// ─── BUSINESS HOURS CONFIG ───────────────────────────────────────────────────
const BUSINESS_TZ = "America/New_York"; // Miami time (handles EST/EDT automatically)
const WORK_START_HOUR = 8;   // 8:00 AM
const WORK_END_HOUR = 16;    // 4:00 PM
const APPOINTMENT_DURATION_MIN = 120; // 2 hours per appointment
const SLOT_INTERVAL_MIN = 30;         // show options every 30 minutes

// ─── Convert a Miami wall-clock time (Y/M/D H:M) into the correct UTC Date ──
// Handles EST/EDT automatically without hardcoding an offset.
function miamiWallTimeToUTC(year, month, day, hour, minute) {
  const naiveUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).formatToParts(naiveUTC);

  const get = (type) => parts.find(p => p.type === type).value;
  const observedMiami = new Date(Date.UTC(
    Number(get("year")), Number(get("month")) - 1, Number(get("day")),
    Number(get("hour")) === 24 ? 0 : Number(get("hour")), Number(get("minute")), Number(get("second"))
  ));

  const diffMs = naiveUTC.getTime() - observedMiami.getTime();
  return new Date(naiveUTC.getTime() + diffMs);
}

function isWeekend(year, month, day) {
  const anchor = miamiWallTimeToUTC(year, month, day, 12, 0);
  const label = new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TZ, weekday: "short" }).format(anchor);
  return label === "Sat" || label === "Sun";
}

// ─── GET AVAILABLE SLOTS FOR A GIVEN DATE (YYYY-MM-DD, Miami calendar date) ─────
// Returns { slots: [{ startISO, endISO, label }], reason } for free 2-hour
// appointment slots starting on 30-minute boundaries between 8AM-4PM Miami time.
export async function getAvailableSlots(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);

  if (isWeekend(year, month, day)) {
    return { slots: [], reason: "closed_weekend" };
  }

  const dayStartUTC = miamiWallTimeToUTC(year, month, day, WORK_START_HOUR, 0);
  const dayEndUTC = miamiWallTimeToUTC(year, month, day, WORK_END_HOUR, 0);

  const token = await getToken();

  const url = `https://graph.microsoft.com/v1.0/users/${process.env.MAILBOX}/calendarView` +
    `?startDateTime=${encodeURIComponent(dayStartUTC.toISOString())}` +
    `&endDateTime=${encodeURIComponent(dayEndUTC.toISOString())}` +
    `&$select=start,end,subject`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`calendarView failed: ${err}`);
  }

  const data = await res.json();
  // Graph dateTime fields come back without a timezone suffix; the value is
  // in UTC by default when no Prefer header is sent, so appending "Z" is safe.
  const existingEventsUTC = (data.value || []).map(ev => ({
    start: new Date(ev.start.dateTime.endsWith("Z") ? ev.start.dateTime : ev.start.dateTime + "Z"),
    end: new Date(ev.end.dateTime.endsWith("Z") ? ev.end.dateTime : ev.end.dateTime + "Z")
  }));

  const slots = [];
  const slotMs = SLOT_INTERVAL_MIN * 60 * 1000;
  const durationMs = APPOINTMENT_DURATION_MIN * 60 * 1000;

  for (let t = dayStartUTC.getTime(); t + durationMs <= dayEndUTC.getTime(); t += slotMs) {
    const slotStart = new Date(t);
    const slotEnd = new Date(t + durationMs);

    const overlaps = existingEventsUTC.some(ev => slotStart < ev.end && slotEnd > ev.start);
    if (overlaps) continue;

    const label = new Intl.DateTimeFormat("en-US", {
      timeZone: BUSINESS_TZ, hour: "numeric", minute: "2-digit", hour12: true
    }).format(slotStart);

    slots.push({
      startISO: slotStart.toISOString(),
      endISO: slotEnd.toISOString(),
      label
    });
  }

  return { slots, reason: null };
}

// Re-checks a specific requested start time right before booking, to guard
// against two people booking the same slot within seconds of each other.
export async function isSlotStillAvailable(startISODate) {
  const start = new Date(startISODate);
  const end = new Date(start.getTime() + APPOINTMENT_DURATION_MIN * 60 * 1000);

  const token = await getToken();
  const url = `https://graph.microsoft.com/v1.0/users/${process.env.MAILBOX}/calendarView` +
    `?startDateTime=${encodeURIComponent(start.toISOString())}` +
    `&endDateTime=${encodeURIComponent(end.toISOString())}` +
    `&$select=start,end`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`calendarView failed: ${err}`);
  }

  const data = await res.json();
  const existingEventsUTC = (data.value || []).map(ev => ({
    start: new Date(ev.start.dateTime.endsWith("Z") ? ev.start.dateTime : ev.start.dateTime + "Z"),
    end: new Date(ev.end.dateTime.endsWith("Z") ? ev.end.dateTime : ev.end.dateTime + "Z")
  }));

  return !existingEventsUTC.some(ev => start < ev.end && end > ev.start);
}

// ─── SEND NOTIFICATION EMAIL ────────────────────────────────────────────────
export async function sendMail(data) {
  const token = await getToken();
  const {
    serviceType, clientType, company, contactPerson, email, phone,
    propertyAddress, claimNumber, date, jobDescription, fileLinks,
    requestTimestamp
  } = data;

  const isEstimationOnly = serviceType === "Estimation";

  const fileSection = fileLinks && fileLinks.length > 0
    ? `\nDocumentos subidos a OneDrive:\n${fileLinks.map(f => `  - ${f.name}: ${f.url}`).join("\n")}`
    : "\nNo se adjuntaron documentos.";

  const requestedAt = requestTimestamp
    ? new Date(requestTimestamp).toLocaleString("en-US", { timeZone: "America/New_York" })
    : new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

  const scheduleLine = isEstimationOnly
    ? `FECHA/HORA DEL PEDIDO : ${requestedAt} (Solo estimación — no se agendó cita)`
    : `FECHA Y HORA DE CITA  : ${new Date(date).toLocaleString("en-US", { timeZone: "America/New_York" })}`;

  const body = `
═══════════════════════════════════════════
   NUEVA SOLICITUD – TRIVAULT LLC
═══════════════════════════════════════════

SERVICIO SOLICITADO : ${serviceType || "No especificado"}
TIPO DE CLIENTE      : ${clientType}
COMPAÑÍA             : ${company || "N/A"}
PERSONA A CARGO      : ${contactPerson}
CORREO               : ${email}
TELÉFONO             : ${phone}

DIRECCIÓN            : ${propertyAddress}
CLAIM / CASE #       : ${claimNumber}
${scheduleLine}
SOLICITUD REGISTRADA : ${requestedAt}

───────────────────────────────────────────
DESCRIPCIÓN DEL TRABAJO:
${jobDescription ? jobDescription.trim() : "No se proporcionó descripción."}
───────────────────────────────────────────
${fileSection}

═══════════════════════════════════════════
   TriVault LLC | TriVault@FloridaParamount.com
`;

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${process.env.MAILBOX}/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: {
        subject: `🗂 ${serviceType || "Nueva Solicitud"} – Claim #${claimNumber} | ${contactPerson}`,
        body: { contentType: "Text", content: body },
        toRecipients: [{ emailAddress: { address: process.env.MAILBOX } }]
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`sendMail failed: ${err}`);
  }
}

// ─── CREATE OUTLOOK CALENDAR EVENT ──────────────────────────────────────────
export async function createEvent(data) {
  const token = await getToken();
  const { contactPerson, claimNumber, propertyAddress, clientType, company, date, jobDescription, serviceType } = data;

  // Event duration: 2 hours
  const startDate = new Date(date);
  const endDate = new Date(startDate.getTime() + APPOINTMENT_DURATION_MIN * 60 * 1000);

  const calendarBody = [
    `Servicio        : ${serviceType || "N/A"}`,
    `Tipo de cliente : ${clientType}`,
    `Compañía        : ${company}`,
    `Dirección       : ${propertyAddress}`,
    `Claim / Case #  : ${claimNumber}`,
    ``,
    `─── DESCRIPCIÓN DEL TRABAJO ───`,
    jobDescription ? jobDescription.trim() : "No se proporcionó descripción."
  ].join("\n");

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${process.env.MAILBOX}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      subject: `Inspección – Claim #${claimNumber} | ${contactPerson}`,
      body: {
        contentType: "Text",
        content: calendarBody
      },
      start: { dateTime: startDate.toISOString(), timeZone: "America/New_York" },
      end:   { dateTime: endDate.toISOString(),   timeZone: "America/New_York" },
      location: { displayName: propertyAddress }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`createEvent failed: ${err}`);
  }
}

// ─── UPLOAD FILE TO ONEDRIVE ─────────────────────────────────────────────────
// Files are organized in: TriVault-Claims/{claimNumber}/{filename}
export async function uploadToOneDrive(claimNumber, fileName, fileBuffer, mimeType) {
  const token = await getToken();
  const folderPath = `TriVault-Claims/${claimNumber}`;
  const filePath = `${folderPath}/${fileName}`;
  const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, "/");

  // Use upload session for files up to 60MB
  const sessionRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${process.env.MAILBOX}/drive/root:/${encodedPath}:/createUploadSession`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        item: {
          "@microsoft.graph.conflictBehavior": "rename",
          name: fileName
        }
      })
    }
  );

  if (!sessionRes.ok) {
    const err = await sessionRes.text();
    throw new Error(`createUploadSession failed: ${err}`);
  }

  const { uploadUrl } = await sessionRes.json();

  // Upload the file
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Length": fileBuffer.length,
      "Content-Range": `bytes 0-${fileBuffer.length - 1}/${fileBuffer.length}`,
      "Content-Type": mimeType || "application/octet-stream"
    },
    body: fileBuffer
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`File upload failed: ${err}`);
  }

  const uploadedFile = await uploadRes.json();

  // Create a shareable link
  const shareRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${process.env.MAILBOX}/drive/items/${uploadedFile.id}/createLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ type: "view", scope: "organization" })
    }
  );

  let shareUrl = uploadedFile.webUrl;
  if (shareRes.ok) {
    const shareData = await shareRes.json();
    shareUrl = shareData.link?.webUrl || shareUrl;
  }

  return { name: fileName, url: shareUrl };
}

