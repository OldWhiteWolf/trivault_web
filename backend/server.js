import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import cors from "cors";
import { sendMail, createEvent, uploadToOneDrive, getAvailableSlots, isSlotStillAvailable } from "./graph.js";


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


app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ].filter(Boolean),
  methods: ["GET", "POST"],
}));


//-------TEST------app.use(cors());


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


// ─── AVAILABILITY: returns free 2-hour slots (8AM-4PM Miami, Mon-Fri) for a date ──
// Query: GET /availability?date=YYYY-MM-DD (date is the Miami calendar date)
app.get("/availability", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Provide date as YYYY-MM-DD." });
    }

    // Block same-day booking: requested date must be strictly after "today" in Miami.
    const todayMiami = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
    if (date <= todayMiami) {
      return res.json({ slots: [], reason: "same_day_or_past_not_allowed" });
    }

    const result = await getAvailableSlots(date);
    res.json(result);

  } catch (err) {
    console.error("Availability error:", err);
    res.status(500).json({ error: "Could not retrieve availability." });
  }
});


// ─── SUBMIT INSPECTION REQUEST ────────────────────────────────────────────────
app.post("/submit", upload.array("documents", 10), async (req, res) => {
  //-----TEST-------console.log("SUBMIT HIT");
  //----------------
  try {
    const {
      serviceType,
      clientType,
      company,
      contactPerson,
      email,
      phone,
      propertyAddress,
      claimNumber,
      date,
      jobDescription,
      isSubmissionTimestamp
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

    // "date" para Estimation es el timestamp exacto en que se hizo el pedido
    // (el frontend ya lo envía así con isSubmissionTimestamp = "true").
    // Para los demás servicios, "date" es la fecha/hora preferida de inspección.
    const requestTimestamp = new Date().toISOString();

    const payload = {
      serviceType,
      clientType,
      company,
      contactPerson,
      email,
      phone,
      propertyAddress,
      claimNumber,
      date,
      jobDescription,
      fileLinks,
      isSubmissionTimestamp,
      requestTimestamp
    };

    const isEstimationOnly = serviceType === "Estimation";

    // 2) Create Outlook calendar event — SOLO si requiere inspección física.
    //    Para "Estimation" no se agenda nada; solo queda registrada la
    //    hora exacta del pedido (requestTimestamp) en el correo de abajo.
    if (!isEstimationOnly) {
      // Re-check availability right before booking, in case another request
      // claimed this exact slot in the seconds since the client last checked.
      const stillFree = await isSlotStillAvailable(date);
      if (!stillFree) {
        return res.status(409).json({
          error: "That time slot was just booked by someone else. Please choose another available time."
        });
      }
      await createEvent(payload);
    }

    // 3) Send notification email (siempre, con todos los datos del formulario)
    await sendMail(payload);

    res.json({
      success: true,
      message: isEstimationOnly
        ? "Estimation request registered successfully. No appointment was scheduled."
        : "Appointment scheduled successfully.",
      filesUploaded: fileLinks.length
    });

  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ error: "Internal server error. Please try again or call us directly." });
  }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT,"0.0.0.0", () => console.log(`✅ TriVault backend running on port ${PORT}`));
