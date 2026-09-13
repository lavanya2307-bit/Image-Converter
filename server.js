require("dotenv").config();

const express = require("express");
const cookieSession = require("cookie-session");
const Database = require("better-sqlite3");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "image-converter.db");
const HOST = process.env.HOST || "0.0.0.0";

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
  console.warn("WARNING: Set ADMIN_EMAIL, ADMIN_PASSWORD and SESSION_SECRET in .env before production use.");
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    last_seen TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    input_name TEXT,
    output_name TEXT,
    file_count INTEGER NOT NULL DEFAULT 1,
    output_size INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

app.use(express.json({ limit: "2mb" }));

app.set("trust proxy", 1);

app.use(cookieSession({
  name: "image_converter_session",
  keys: [process.env.SESSION_SECRET || "dev-only-change-me"],
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 24 * 30
}));

// Serve the browser-side processing libraries locally so PDF tools do not depend on a CDN.
app.get("/vendor/jspdf.umd.min.js", (req, res) => {
  res.sendFile(path.join(__dirname, "node_modules", "jspdf", "dist", "jspdf.umd.min.js"));
});
app.get("/vendor/pdf-lib.min.js", (req, res) => {
  res.sendFile(path.join(__dirname, "node_modules", "pdf-lib", "dist", "pdf-lib.min.js"));
});
app.get("/vendor/jszip.min.js", (req, res) => {
  res.sendFile(path.join(__dirname, "node_modules", "jszip", "dist", "jszip.min.js"));
});

// Serve root-level build first; also support an optional public/ directory.
app.use(express.static(__dirname, { index: "index.html" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, service: "image-converter" });
});

const now = () => new Date().toISOString();

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mailer() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

app.post("/api/register", async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 80);
  const email = String(req.body.email || "").trim().toLowerCase().slice(0, 160);

  if (!name || !validEmail(email)) {
    return res.status(400).json({ error: "Enter a valid name and email." });
  }

  const timestamp = now();
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  let user;
  let isNew = false;

  if (existing) {
    db.prepare("UPDATE users SET name = ?, last_seen = ? WHERE id = ?")
      .run(name, timestamp, existing.id);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(existing.id);
  } else {
    const result = db.prepare(`
      INSERT INTO users (name, email, created_at, last_seen)
      VALUES (?, ?, ?, ?)
    `).run(name, email, timestamp, timestamp);

    user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    isNew = true;
  }

  req.session.userId = user.id;

  if (isNew) {
    const transport = mailer();
    if (transport && process.env.OWNER_EMAIL) {
      try {
        await transport.sendMail({
          from: process.env.SMTP_USER,
          to: process.env.OWNER_EMAIL,
          subject: "New Image Converter user",
          text: `A new user registered.

Name: ${name}
Email: ${email}
Time: ${timestamp}`
        });
      } catch (error) {
        console.error("Owner email notification failed:", error.message);
      }
    }
  }

  res.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

app.post("/api/activity", (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "User session not found." });

  const action = String(req.body.action || "Unknown").slice(0, 60);
  const inputName = String(req.body.input_name || "").slice(0, 500);
  const outputName = String(req.body.output_name || "").slice(0, 500);
  const fileCount = Math.max(1, Math.min(10000, Number(req.body.file_count || 1)));
  const outputSize = Math.max(0, Number(req.body.output_size || 0));

  db.prepare(`
    INSERT INTO activity
      (user_id, action, input_name, output_name, file_count, output_size, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    action,
    inputName,
    outputName,
    Number.isFinite(fileCount) ? fileCount : 1,
    Number.isFinite(outputSize) ? outputSize : 0,
    now()
  );

  db.prepare("UPDATE users SET last_seen = ? WHERE id = ?").run(now(), userId);

  res.json({ ok: true });
});

function adminOnly(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Owner authentication required." });
  }
  next();
}

app.post("/api/admin/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");

  if (email === adminEmail && password === adminPassword && adminEmail) {
    req.session.admin = true;
    return res.json({ ok: true });
  }

  res.status(401).json({ error: "Invalid owner credentials." });
});

app.post("/api/admin/logout", adminOnly, (req, res) => {
  req.session.admin = false;
  res.json({ ok: true });
});

app.get("/api/admin/me", adminOnly, (req, res) => {
  res.json({ ok: true });
});

app.get("/api/admin/summary", adminOnly, (req, res) => {
  const users = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const activities = db.prepare("SELECT COUNT(*) AS count FROM activity").get().count;
  const activeUsers = db.prepare("SELECT COUNT(*) AS count FROM users WHERE datetime(last_seen) >= datetime('now', '-15 minutes')").get().count;

  const converted = db.prepare(
    "SELECT COUNT(*) AS count FROM activity WHERE action = 'Image conversion'"
  ).get().count;

  const imagePdfs = db.prepare(
    "SELECT COUNT(*) AS count FROM activity WHERE action = 'Image to PDF'"
  ).get().count;

  const hd = db.prepare(
    "SELECT COUNT(*) AS count FROM activity WHERE action = 'HD quality'"
  ).get().count;

  const merged = db.prepare(
    "SELECT COUNT(*) AS count FROM activity WHERE action = 'PDF merge'"
  ).get().count;

  res.json({
    users,
    activeUsers,
    activities,
    converted,
    imagePdfs,
    hd,
    merged
  });
});

app.get("/api/admin/users", adminOnly, (req, res) => {
  const rows = db.prepare(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.created_at,
      u.last_seen,
      COUNT(a.id) AS activity_count
    FROM users u
    LEFT JOIN activity a ON a.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();

  res.json({ users: rows });
});

app.get("/api/admin/activity", adminOnly, (req, res) => {
  const rows = db.prepare(`
    SELECT
      a.id,
      a.action,
      a.input_name,
      a.output_name,
      a.file_count,
      a.output_size,
      a.created_at,
      u.name,
      u.email
    FROM activity a
    LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC
    LIMIT 500
  `).all();

  res.json({ activity: rows });
});

app.get("/owner.html", (req, res) => {
  res.sendFile(path.join(__dirname, "owner.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`Image Converter listening on ${HOST}:${PORT}`);
  console.log(`Owner portal: /owner.html`);
});
