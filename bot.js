import { Telegraf, Markup } from "telegraf";
import { getProducts, applyMove } from "./db.js";

const fmt = (n) => (n ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const HELP =
  "📦 *Ombor boti*\n\n" +
  "Oddiy yozib buyruq bering (avval son, keyin tovar nomi, keyin amal):\n\n" +
  "• `300 lesa ketdi` — arendaga chiqdi\n" +
  "• `50 lesa qaytdi` — arendadan qaytdi\n" +
  "• `100 stoyka 4m qoshildi` — omborga yangi tovar keldi\n" +
  "• `qoldiq` — barcha tovarlar holati\n\n" +
  "Yoki pastdagi tugma orqali ilovani oching 👇";

function detectType(t) {
  if (/(yangi|qo.?sh|sotib|keltir)/i.test(t)) return "add";
  if (/(qaytdi|qaytib|qayt|keldi)/i.test(t)) return "ret";
  if (/(ketdi|ketti|chiqdi|chiqti|berildi|olib\s*ket|arenda)/i.test(t)) return "out";
  return null;
}

export function startBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.log("⚠️  BOT_TOKEN yo'q — bot ishga tushmadi (faqat mini app ishlaydi)");
    return;
  }

  const bot = new Telegraf(token);
  const webAppUrl = process.env.WEBAPP_URL;

  const openKeyboard = webAppUrl
    ? Markup.keyboard([Markup.button.webApp("📦 Omborni ochish", webAppUrl)]).resize()
    : Markup.removeKeyboard();

  bot.start((ctx) => ctx.replyWithMarkdown(HELP, openKeyboard));
  bot.help((ctx) => ctx.replyWithMarkdown(HELP, openKeyboard));

  bot.hears(/qoldiq|hisobot|holat|qancha|ombor$/i, async (ctx) => {
    try {
      const products = await getProducts();
      let msg = "📦 *Ombor holati*\n\n";
      for (const p of products) {
        const ombor = p.total - p.out;
        msg += `• ${p.name} — omborda *${fmt(ombor)}*` +
          (p.out > 0 ? ` (arendada ${fmt(p.out)})` : "") + "\n";
      }
      await ctx.replyWithMarkdown(msg);
    } catch (e) {
      await ctx.reply("❌ Bazadan o'qishda xatolik. Birozdan keyin urinib ko'ring.");
    }
  });

  bot.on(["voice", "audio", "video_note"], (ctx) =>
    ctx.replyWithMarkdown(
      "🎙 Hozircha ovozli xabarni tushunmayman.\n" +
        "Iltimos, yozib yuboring — masalan: `50 lesa ketdi`"
    )
  );

  bot.on("text", async (ctx) => {
    const raw = ctx.message.text.trim();
    const t = raw.toLowerCase();

    const type = detectType(t);
    if (!type) {
      return ctx.replyWithMarkdown(HELP, openKeyboard);
    }

    try {
      const products = await getProducts();

      // Eng uzun mos keladigan tovar nomini tanlaymiz (masalan "monolit lesa 2m" > "lesa")
      let text = t;
      const matched = products
        .filter((p) => text.includes(p.name.toLowerCase()))
        .sort((a, b) => b.name.length - a.name.length)[0];

      if (!matched) {
        return ctx.reply(
          "❓ Qaysi tovar? Nomini aniqroq yozing. Masalan: `300 lesa ketdi`",
          { parse_mode: "Markdown" }
        );
      }

      // Tovar nomini olib tashlab, qolgan matndan sonni ajratamiz
      text = text.replace(matched.name.toLowerCase(), " ");
      text = text.replace(/(\d)\s+(\d)/g, "$1$2"); // "1 000" -> "1000"
      const num = parseInt((text.match(/\d+/) || [])[0], 10);
      if (!num || num <= 0) {
        return ctx.reply("❓ Sonini yozing. Masalan: `300 lesa ketdi`", {
          parse_mode: "Markdown",
        });
      }

      const r = await applyMove(matched.id, type, num);
      const word = type === "out" ? "chiqdi" : type === "ret" ? "qaytdi" : "qo'shildi";
      await ctx.replyWithMarkdown(
        `✅ *${fmt(num)} ${r.name}* ${word}.\n` +
          `Omborda: *${fmt(r.ombor)}*` +
          (r.out > 0 ? `  ·  Arendada: ${fmt(r.out)}` : "")
      );
    } catch (e) {
      if (e.message === "not_enough")
        return ctx.reply("⚠️ Omborda shuncha tovar yo'q.");
      if (e.message === "too_many")
        return ctx.reply("⚠️ Arendada shuncha tovar yo'q.");
      console.error(e);
      await ctx.reply("❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    }
  });

  bot.launch().then(() => console.log("🤖 Telegram bot ishga tushdi"));

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
