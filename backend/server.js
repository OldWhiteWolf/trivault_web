import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import cors from "cors";
import { sendMail, createEvent, uploadToOneDrive } from "./graph.js";


if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}


const app = express();

// ─── CORS: allow your GitHub Pages domain ────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || "*",   // e.g. https://yourusername.github.io
  "http://localhost:5500",            // for local development with Live Server
  "http://127.0.0.1:5500"
];


app.use(cors());


app.use(express.json());

// ─── MULTER: in-memory file storage (max 50MB per file, 10 files) ──────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg", "image/png", "image/heic", "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  }
});


app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});


// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
//---------TEST-----

app.get("/test", (req, res) => {
  res.send("VERSION NUEVA");
});


// ─── SUBMIT INSPECTION REQUEST ────────────────────────────────────────────────
app.post("/submit", upload.array("documents", 10), async (req, res) => {
  try {
    const {
      clientType,
      company,
      contactPerson,
      email,
      phone,
      propertyAddress,
      claimNumber,
      date,
      jobDescription
    } = req.body;

    // Validate required fields
    if (!clientType || !contactPerson || !email || !phone || !propertyAddress || !claimNumber || !date) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // 1) Upload documents to OneDrive (if any)
    const fileLinks = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Prefix filename with claim number for easy identification
        const safeClaimNumber = claimNumber.replace(/[^a-zA-Z0-9-_]/g, "_");
        const prefixedName = `${safeClaimNumber}_${file.originalname}`;

        const link = await uploadToOneDrive(
          safeClaimNumber,
          prefixedName,
          file.buffer,
          file.mimetype
        );
        fileLinks.push(link);
      }
    }

    const payload = { clientType, company, contactPerson, email, phone, propertyAddress, claimNumber, date, jobDescription, fileLinks };

    // 2) Create Outlook calendar event
    await createEvent(payload);

    // 3) Send notification email
    await sendMail(payload);

    res.json({
      success: true,
      message: "Appointment scheduled successfully.",
      filesUploaded: fileLinks.length
    });

  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ error: "Internal server error. Please try again or call us directly." });
  }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT,"0.0.0.0", () => console.log(`✅ TriVault backend running on port ${PORT}`));
