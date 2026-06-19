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

// ─── SEND NOTIFICATION EMAIL ────────────────────────────────────────────────
export async function sendMail(data) {
  const token = await getToken();
  const { clientType, company, contactPerson, email, phone, propertyAddress, claimNumber, date, jobDescription, fileLinks } = data;

  const fileSection = fileLinks && fileLinks.length > 0
    ? `\nDocumentos subidos a OneDrive:\n${fileLinks.map(f => `  - ${f.name}: ${f.url}`).join("\n")}`
    : "\nNo se adjuntaron documentos.";

  const body = `
═══════════════════════════════════════════
   NUEVA CITA DE INSPECCIÓN – TRIVAULT LLC
═══════════════════════════════════════════

TIPO DE CLIENTE : ${clientType}
COMPAÑÍA        : ${company}
PERSONA A CARGO : ${contactPerson}
CORREO          : ${email}
TELÉFONO        : ${phone}

DIRECCIÓN       : ${propertyAddress}
CLAIM / CASE #  : ${claimNumber}
FECHA SOLICITADA: ${new Date(date).toLocaleString("en-US", { timeZone: "America/New_York" })}

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
        subject: `🗂 Nueva Inspección – Claim #${claimNumber} | ${contactPerson}`,
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
  const { contactPerson, claimNumber, propertyAddress, clientType, company, date, jobDescription } = data;

  // Event duration: 2 hours
  const startDate = new Date(date);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const calendarBody = [
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
