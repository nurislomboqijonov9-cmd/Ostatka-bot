import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import { init, getProducts, getHistory, applyMove, setTotal, resetAll, addProduct, deleteProduct } from "./db.js";
import { startBot } from "./bot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── Parol himoyasi (barcha /api yo'llari uchun) ───
const APP_PASSWORD = process.env.APP_PASSWORD || "2000";
app.use("/api", (req, res, next) => {
  if ((req.headers["x-app-password"] || "") !== APP_PASSWORD) {
    return res.status(401).json({ error: "auth" });
  }
  next();
});

// ─── API ───
app.get("/api/products", async (_req, res) => {
  try {
    res.json(await getProducts());
  } catch (e) {
    res.status(500).json({ error: "db" });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    res.json(await getHistory(req.query.pid || null));
  } catch (e) {
    res.status(500).json({ error: "db" });
  }
});

app.post("/api/move", async (req, res) => {
  const { pid, type, qty } = req.body || {};
  try {
    res.json(await applyMove(pid, type, qty));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/total", async (req, res) => {
  const { pid, total } = req.body || {};
  try {
    res.json(await setTotal(pid, total));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/reset", async (_req, res) => {
  try {
    await resetAll();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "db" });
  }
});

app.post("/api/product", async (req, res) => {
  const { name, total } = req.body || {};
  try {
    res.json(await addProduct(name, total));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/product-delete", async (req, res) => {
  const { id } = req.body || {};
  try {
    await deleteProduct(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;

init()
  .then(() => {
    app.listen(PORT, () => console.log(`🌐 Server ${PORT}-portda ishlayapti`));
    startBot();
  })
  .catch((e) => {
    console.error("❌ Bazaga ulanib bo'lmadi:", e.message);
    process.exit(1);
  });
