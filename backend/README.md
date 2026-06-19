# TriVault LLC – Inspection Intake System

## Deployment Guide

\---

## Architecture

```
GitHub Pages (free)          Railway / Render (free tier)
┌────────────────────┐       ┌──────────────────────────────┐
│  index.html        │──────▶│  server.js (Express)         │
│  (your website)    │  POST │  ├── graph.js                │
│                    │       │  │   ├── sendMail()           │
└────────────────────┘       │  │   ├── createEvent()        │
                             │  │   └── uploadToOneDrive()   │
                             │  └── multer (file upload)     │
                             └──────────────┬───────────────┘
                                            │ Microsoft Graph API
                                            ▼
                                  ┌─────────────────────┐
                                  │  Microsoft 365       │
                                  │  ├── Outlook Mail    │
                                  │  ├── Calendar        │
                                  │  └── OneDrive        │
                                  └─────────────────────┘
```

\---

## Step 1 – Azure AD App Registration

1. Go to https://portal.azure.com → **Azure Active Directory** → **App registrations** → **New registration**
2. Name: `TriVault-Intake`, Account type: **Single tenant**
Application (client) ID: 09564e0c-f93e-4a6a-8714-88c76ea92e75
Directory (tenant) ID: ada953d7-f222-4b44-b52d-b406eb6de693
3. Go to **Certificates \& secrets** → New client secret → copy the value ---- Value: gSg8Q\~p-RjAVdrtFy8nMw.h2C0tNAxZwM13RSa9w
4. Go to **API permissions** → Add the following **Application** (not Delegated) permissions:

   * `Mail.Send`
   * `Calendars.ReadWrite`
   * `Files.ReadWrite.All`
5. Click **Grant admin consent**
6. Copy **Application (client) ID** and **Directory (tenant) ID** from the Overview page

\---

## Step 2 – Deploy Backend to Railway (free)

1. Create a free account at https://railway.app
2. New Project → **Deploy from GitHub repo** → select the `backend/` folder
(or push only the backend files to a separate repo)
3. In Railway, go to **Variables** and add:

```
   CLIENT\_ID=your-azure-client-id
   CLIENT\_SECRET=your-azure-client-secret
   TENANT\_ID=your-azure-tenant-id
   MAILBOX=TriVault@FloridaParamount.com
   FRONTEND\_URL=https://yourusername.github.io
   ```

4. Railway will give you a URL like: `https://trivault-backend.railway.app`

\---

## Step 3 – Update Frontend

In `intake-form-snippet.html` (and in your `index.html`), change:

```javascript
const BACKEND\_URL = "https://YOUR-BACKEND.railway.app";
```

to your actual Railway URL.

\---

## Step 4 – Integrate the Form into index.html

1. **Add the CSS** — copy everything between `/\* ─── STYLES \*/` and `-->` into your existing `<style>` tag
2. **Remove** the old `<form id="bookingForm">...</form>` block and its `<script>` tag from index.html
3. **Remove** the old `#intake` section (the one with the Microsoft Forms link button)
4. **Paste** the new `<!-- ─── INTAKE SECTION HTML -->` block where the old intake section was
5. **Paste** the `<!-- ─── INTAKE FORM JAVASCRIPT -->` block right before `</body>`

\---

## Step 5 – Deploy Frontend to GitHub Pages

1. Push your `index.html` (and all assets) to a GitHub repository
2. Go to repo **Settings** → **Pages** → Source: **Deploy from branch** → `main` / `root`
3. Your site will be live at `https://yourusername.github.io/repo-name`

\---

## OneDrive Folder Structure

Files are automatically organized as:

```
OneDrive (TriVault@FloridaParamount.com)
└── TriVault-Claims/
    ├── CLM-2026-00001/
    │   ├── CLM-2026-00001\_policy.pdf
    │   └── CLM-2026-00001\_photo1.jpg
    └── CLM-2026-00002/
        └── CLM-2026-00002\_estimate.docx
```

\---

## Files in this Package

```
backend/
├── server.js          ← Express API server
├── graph.js           ← Microsoft Graph integration
├── package.json       ← Dependencies
└── .env.example       ← Environment variable template

frontend/
└── intake-form-snippet.html  ← Form HTML + CSS + JS to paste into index.html
```

