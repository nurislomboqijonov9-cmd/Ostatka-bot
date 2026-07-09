import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import { init, getProducts, getHistory, applyMove, setTotal } from "./db.js";
import { startBot } from "./bot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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
