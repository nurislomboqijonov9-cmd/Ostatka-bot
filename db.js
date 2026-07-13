import pg from "pg";
const { Pool } = pg;

// Railway ichki ulanishi SSL talab qilmaydi. Tashqi URL bo'lsa (sslmode=require) — yoqamiz.
const url = process.env.DATABASE_URL || "";
const useSSL = /sslmode=require/.test(url) || process.env.PGSSL === "true";

export const pool = new Pool({
  connectionString: url,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

// ─── Boshlang'ich mahsulotlar (raqamlar keyin o'zgartiriladi) ───
export const SEED = [
  { id: "lesa", name: "Lesa", total: 0 },
  { id: "lesa80", name: "Lesa 80lik", total: 0 },
  { id: "stoyka370", name: "Stoyka 3.70m", total: 0 },
  { id: "stoyka4", name: "Stoyka 4m", total: 0 },
  { id: "stoyka45", name: "Stoyka 4.5m", total: 0 },
  { id: "stoyka5", name: "Stoyka 5m", total: 0 },
  { id: "stoyka55", name: "Stoyka 5.5m", total: 0 },
  { id: "monolit15", name: "Monolit lesa 1.5m", total: 0 },
  { id: "monolit2", name: "Monolit lesa 2m", total: 0 },
  { id: "rezba1", name: "Rezba 1m", total: 0 },
  { id: "rezba120", name: "Rezba 1.20m", total: 0 },
  { id: "soedinitel", name: "Soedinitel", total: 0 },
  { id: "univilka", name: "Univilka", total: 0 },
  { id: "balka3", name: "Balka 3m", total: 0 },
  { id: "tayrot1", name: "Tayrot 1m", total: 0 },
  { id: "tayrot120", name: "Tayrot 1.20m", total: 0 },
  { id: "shpilka1", name: "Shpilka 1m", total: 0 },
  { id: "shpilka120", name: "Shpilka 1.20m", total: 0 },
  { id: "gayka", name: "Gayka", total: 0 },
  { id: "lyulka", name: "Lyulka", total: 0 },
];

export async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      total      INTEGER NOT NULL DEFAULT 0,
      out_qty    INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS history (
      id           SERIAL PRIMARY KEY,
      product_id   TEXT NOT NULL,
      product_name TEXT NOT NULL,
      type         TEXT NOT NULL,
      qty          INTEGER NOT NULL,
      ombor_after  INTEGER NOT NULL,
      ts           TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM products");
  if (rows[0].c === 0) {
    let i = 0;
    for (const p of SEED) {
      await pool.query(
        "INSERT INTO products (id, name, total, out_qty, sort_order) VALUES ($1,$2,$3,0,$4)",
        [p.id, p.name, p.total, i++]
      );
    }
    console.log("✅ Boshlang'ich mahsulotlar bazaga qo'shildi");
  }
}

export async function getProducts() {
  const { rows } = await pool.query(
    "SELECT id, name, total, out_qty AS out FROM products ORDER BY sort_order"
  );
  return rows;
}

export async function getHistory(pid, limit = 500) {
  if (pid) {
    const { rows } = await pool.query(
      "SELECT id, product_id AS pid, product_name AS name, type, qty, ombor_after AS ombor, ts FROM history WHERE product_id=$1 ORDER BY id DESC LIMIT $2",
      [pid, limit]
    );
    return rows;
  }
  const { rows } = await pool.query(
    "SELECT id, product_id AS pid, product_name AS name, type, qty, ombor_after AS ombor, ts FROM history ORDER BY id DESC LIMIT $1",
    [limit]
  );
  return rows;
}

// Atomik harakat: bir vaqtda ikki kishi ishlatsa ham xato bo'lmaydi
export async function applyMove(pid, type, qty) {
  qty = parseInt(qty, 10);
  if (!qty || qty <= 0) throw new Error("bad_qty");
  if (!["out", "ret", "add", "writeoff"].includes(type)) throw new Error("bad_type");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT * FROM products WHERE id=$1 FOR UPDATE",
      [pid]
    );
    const p = rows[0];
    if (!p) throw new Error("not_found");

    let total = p.total;
    let out = p.out_qty;

    if (type === "out") {
      if (qty > total - out) throw new Error("not_enough");
      out += qty;
    } else if (type === "ret") {
      if (qty > out) throw new Error("too_many");
      out -= qty;
    } else if (type === "add") {
      total += qty;
    } else if (type === "writeoff") {
      if (qty > total - out) throw new Error("not_enough");
      total -= qty;
    }

    await client.query("UPDATE products SET total=$1, out_qty=$2 WHERE id=$3", [
      total,
      out,
      pid,
    ]);
    const ombor = total - out;
    await client.query(
      "INSERT INTO history (product_id, product_name, type, qty, ombor_after) VALUES ($1,$2,$3,$4,$5)",
      [pid, p.name, type, qty, ombor]
    );
    await client.query("COMMIT");
    return { id: p.id, name: p.name, total, out, ombor };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function setTotal(pid, total) {
  total = Math.max(0, parseInt(total, 10) || 0);
  const { rows } = await pool.query("SELECT out_qty FROM products WHERE id=$1", [
    pid,
  ]);
  if (!rows[0]) throw new Error("not_found");
  const out = Math.min(rows[0].out_qty, total);
  await pool.query("UPDATE products SET total=$1, out_qty=$2 WHERE id=$3", [
    total,
    out,
    pid,
  ]);
  return { id: pid, total, out, ombor: total - out };
}

// Hammasini 0 qilish va tarixni tozalash (yangi boshlash uchun)
export async function resetAll() {
  await pool.query("UPDATE products SET total=0, out_qty=0");
  await pool.query("DELETE FROM history");
}

// Yangi tovar qo'shish
export async function addProduct(name, total = 0) {
  name = String(name || "").trim();
  if (!name) throw new Error("bad_name");
  total = Math.max(0, parseInt(total, 10) || 0);
  const base =
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tovar";
  const id = base + "-" + Date.now().toString(36);
  const { rows } = await pool.query(
    "SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM products"
  );
  await pool.query(
    "INSERT INTO products (id, name, total, out_qty, sort_order) VALUES ($1,$2,$3,0,$4)",
    [id, name, total, rows[0].n]
  );
  return { id, name, total, out: 0, ombor: total };
}

// Tovarni o'chirish (tarixi bilan)
export async function deleteProduct(id) {
  await pool.query("DELETE FROM history WHERE product_id=$1", [id]);
  await pool.query("DELETE FROM products WHERE id=$1", [id]);
}

// Tovar nomini o'zgartirish
export async function renameProduct(id, name) {
  name = String(name || "").trim();
  if (!name) throw new Error("bad_name");
  await pool.query("UPDATE products SET name=$1 WHERE id=$2", [name, id]);
  // tarixdagi nomni ham yangilaymiz (ko'rinish uchun)
  await pool.query("UPDATE history SET product_name=$1 WHERE product_id=$2", [name, id]);
  return { id, name };
}
