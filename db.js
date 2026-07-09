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
  { id: "lesa", name: "Lesa", total: 5000 },
  { id: "lesa80", name: "Lesa 80lik", total: 2000 },
  { id: "stoyka370", name: "Stoyka 3.70m", total: 800 },
  { id: "stoyka4", name: "Stoyka 4m", total: 800 },
  { id: "stoyka45", name: "Stoyka 4.5m", total: 800 },
  { id: "stoyka5", name: "Stoyka 5m", total: 800 },
  { id: "stoyka55", name: "Stoyka 5.5m", total: 800 },
  { id: "monolit15", name: "Monolit lesa 1.5m", total: 500 },
  { id: "monolit2", name: "Monolit lesa 2m", total: 500 },
  { id: "rezba1", name: "Rezba 1m", total: 3000 },
  { id: "rezba120", name: "Rezba 1.20m", total: 3000 },
  { id: "soedinitel", name: "Soedinitel", total: 4000 },
  { id: "univilka", name: "Univilka", total: 2000 },
  { id: "balka3", name: "Balka 3m", total: 1000 },
  { id: "tayrot1", name: "Tayrot 1m", total: 2000 },
  { id: "tayrot120", name: "Tayrot 1.20m", total: 2000 },
  { id: "shpilka1", name: "Shpilka 1m", total: 3000 },
  { id: "shpilka120", name: "Shpilka 1.20m", total: 3000 },
  { id: "gayka", name: "Gayka", total: 5000 },
  { id: "lyulka", name: "Lyulka", total: 100 },
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
  if (!["out", "ret", "add"].includes(type)) throw new Error("bad_type");

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
