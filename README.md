# 📦 Ombor Bot — o'rnatish qo'llanmasi

Lesa jihozlari uchun ombor–arenda hisobi. Telegram bot + mini app + doimiy baza (Postgres).
Ma'lumot **Postgres**da saqlanadi, shuning uchun botni qayta deploy qilsangiz ham **hech narsa o'chmaydi**.

Faqat **1 ta API key** kerak: Telegram bot tokeni. Boshqa hech narsa kerak emas.

---

## 1-qadam — Telegram botni yaratish (2 daqiqa)

1. Telegramda **@BotFather** ni oching
2. `/newbot` deb yozing
3. Botga nom bering (masalan: `Ombor Hisob`)
4. Username bering (`_bot` bilan tugashi shart, masalan: `ombor_hisob_bot`)
5. BotFather sizga **token** beradi — shunga o'xshash:
   `1234567890:AAH...xyz`
6. Bu tokenni **saqlab qo'ying** — bu sizning `BOT_TOKEN`ingiz

---

## 2-qadam — Kodni GitHub'ga yuklash

### Qaysi fayllarni yuklaysiz
Ushbu papkadagi **hamma fayllar** ketadi, `.env` va `node_modules` dan tashqari
(`.gitignore` ularni avtomatik chetlab o'tadi):

```
package.json
server.js
db.js
bot.js
public/index.html
.env.example
.gitignore
README.md
```

### Qanday yuklash
1. github.com ga kiring → **New repository** → nom bering (masalan `ombor-bot`) → **Private** tanlang → Create
2. Ochilgan sahifada **"uploading an existing file"** havolasini bosing
3. Yuqoridagi fayllarni (papkasi bilan) sudrab tashlang → **Commit changes**

> Kompyuterda git bo'lsa, terminal orqali ham bo'ladi:
> ```
> git init
> git add .
> git commit -m "birinchi"
> git branch -M main
> git remote add origin https://github.com/USERNAME/ombor-bot.git
> git push -u origin main
> ```

---

## 3-qadam — Railway'da joylashtirish

1. **railway.app** ga kiring → GitHub bilan ro'yxatdan o'ting
2. **New Project** → **Deploy from GitHub repo** → `ombor-bot` reponi tanlang
3. Railway avtomatik `npm install` va `npm start` qiladi

### Postgres bazani qo'shish (ma'lumot o'chmasligi uchun MUHIM)
4. O'sha project ichida **New** (yoki **+ Create**) → **Database** → **Add PostgreSQL**
5. Postgres alohida xizmat sifatida qo'shiladi. Bu baza **doimiy** — kodni qayta deploy qilsangiz ham saqlanib qoladi.

---

## 4-qadam — Sozlamalar (Environment Variables)

Railway'da **botning xizmatini** (Postgres emas, kod xizmatini) bosing → **Variables** →
quyidagilarni qo'shing:

| Nomi | Qiymati |
|------|---------|
| `BOT_TOKEN` | BotFather bergan token |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — shundoq yozing, Railway o'zi ulaydi |
| `WEBAPP_URL` | (hozircha bo'sh qoldiring — 5-qadamdan keyin to'ldiramiz) |

> `${{Postgres.DATABASE_URL}}` — bu **reference**. Shu tarzda yozsangiz, baza manzili
> avtomatik ulanadi va o'zgarsa ham o'zi yangilanadi. Qo'lda parol yozish shart emas.

---

## 5-qadam — Domen olish va WEBAPP_URL

1. Bot xizmatida **Settings** → **Networking** → **Generate Domain** bosing
2. Sizga manzil beriladi, masalan: `https://ombor-bot-production.up.railway.app`
3. Shu manzilni nusxalab, **Variables** ga qayting → `WEBAPP_URL` ga qo'ying
4. Railway qayta deploy qiladi (1-2 daqiqa)

---

## 6-qadam — Ilovani botga ulash (ixtiyoriy, lekin chiroyli)

Botda pastda "📦 Omborni ochish" tugmasi `/start` bosilganda avtomatik chiqadi.
Menu tugmasini ham qo'shmoqchi bo'lsangiz:

1. **@BotFather** → `/mybots` → botingizni tanlang → **Bot Settings** → **Menu Button**
2. **Configure menu button** → 5-qadamdagi domen manzilini yuboring → tugma nomini yozing (masalan `Ombor`)

---

## 7-qadam — Sinash ✅

1. Botingizni Telegramda oching → `/start`
2. Yozib ko'ring:
   - `qoldiq` — barcha tovarlar holati chiqadi
   - `300 lesa ketdi` — omborda 300 ta kamayadi
   - `50 lesa qaytdi` — 50 ta qaytadi
   - `100 stoyka 4m qoshildi` — omborga qo'shiladi
3. "📦 Omborni ochish" tugmasini bosing → mini app ochiladi, tugmalar bilan ishlaysiz

Bot va mini app **bitta bazani** ko'radi — birida o'zgartirsangiz, ikkinchisida ham ko'rinadi.

---

## Tovar sonlarini kiritish

Boshida raqamlar shartli. Haqiqiy sonlarni kiritish uchun:
- Mini app'da yuqoridagi **Sozlash** tugmasini bosing → har tovarning "Jami" sonini yozing
- Yoki `db.js` ichidagi `SEED` ro'yxatini o'zgartirib qayta deploy qiling (faqat baza bo'sh bo'lsa ishlaydi)

---

## Buyruqlar shpargalkasi (bot uchun)

| Yozasiz | Nima bo'ladi |
|---------|--------------|
| `300 lesa ketdi` | 300 ta arendaga chiqdi |
| `50 stoyka 4m qaytdi` | 50 ta qaytib keldi |
| `100 gayka qoshildi` | omborga 100 ta yangi qo'shildi |
| `qoldiq` | hamma tovar holati |

Format: **avval son, keyin tovar nomi, keyin amal**. Tovar nomini ro'yxatdagidek yozing.

---

## Muammo bo'lsa

- **Bot javob bermayapti** → `BOT_TOKEN` to'g'ri kiritilganini va deploy tugaganini tekshiring (Railway → Deployments → yashil "Success")
- **Mini app ochilmayapti** → `WEBAPP_URL` to'ldirilganini va `https://` bilan boshlanganini tekshiring
- **Baza xatosi** → `DATABASE_URL` `${{Postgres.DATABASE_URL}}` shaklida ekanini va Postgres xizmati ishlayotganini tekshiring
- Loglarni Railway → xizmat → **Deploy Logs** dan ko'rasiz
