# Deployment guide — Gamal Abo Hel'al

Do the parts **in order**. Everything here is free except the domain name. Total time: about 1–1.5 hours the first time.

**Your secret admin address will be:** `https://YOURDOMAIN.com/vBZM31AZC3g6eRTdWCRB/`
(Never link it anywhere. See Part 8 to change the code to one only you know.)

---

## What you are setting up (the big picture)

```
 Visitors ──► Website files (Cloudflare Pages, free)
                 │
                 ├──► Supabase (free): products, prices, the editable making charge, admin login, chatbot function
                 │        ▲                         ▲
                 │        │ every 30 min            │ Gemini key lives HERE (never on the website)
                 │   GitHub Action (free)      Google Gemini (chatbot)
                 └──► Google Sheet: receives customer orders
 Domain name bought at GoDaddy ──► points to Cloudflare
```

**Do you need GitHub *and* GoDaddy?** Yes, each does one different job:
- **GitHub** = where the website files are stored (and it runs the 30-minute gold-price update).
- **Cloudflare Pages** = the hosting that shows the site to the world (free, fast, lets us add security headers, and works with a **private** GitHub repo so nobody can browse your code).
- **GoDaddy** = only the domain name (the `.com` address). You don't need GoDaddy hosting.

---

## Part 1 — Database (Supabase) · 10 min

You already have a Supabase project, so you only *upgrade* it.

1. Supabase dashboard → **SQL Editor → New query**.
2. Open `database/upgrade_v2.sql`, copy everything, paste, **Run**. You should see "Success". *(Brand-new empty project? Run `database/schema.sql` instead — it contains everything.)*
3. Open `database/create_admin.sql`. Replace `PUT-ADMIN-NAME-HERE` and `PUT-A-LONG-STRONG-PASSWORD-HERE` with your admin name and a **long** password (14+ characters, letters + numbers + symbols). Run it. The old temporary admin account stops working only if you delete it — uncomment the `delete ... old-name` line at the bottom of that file and run it too.
4. Open `database/chatbot_rate_limit.sql` and run it (safe to run again if you did it before).
5. Supabase → **Project Settings → API**: you will need the **Project URL**, the **publishable (anon) key** (already in `js/config.js`) and the **secret key** (used in Parts 2 and 4; keep it private).

What this gave you: the admin password is now checked **once** by the database, which hands back a random 2-hour session token. The password is never saved in the browser. After **4 wrong tries from the same device/network the login is locked for 30 minutes**. This is enforced inside the database, so it can't be bypassed by editing the page.

---

## Part 2 — Automatic gold & silver prices · 5 min

Prices refresh every 30 minutes and are written straight into the database.

1. Create a GitHub account if needed, then a **new repository** → name e.g. `abohelal-site` → set it **Private** → Create.
2. Upload the whole folder (see Part 5 step 1). 
3. In the repo: **Settings → Secrets and variables → Actions → New repository secret**. Add two:
   - `SUPABASE_URL` = your Project URL (`https://qbndjqvtgnkcjlcatgkp.supabase.co`)
   - `SUPABASE_SECRET_KEY` = the **secret** key from Supabase (starts with `sb_secret_`)
4. **Actions** tab → *Update gold price* → **Run workflow**. A green tick = it saved today's prices. Check Supabase → Table Editor → `gold_prices`.

If the Action ever stops (GitHub pauses scheduled jobs in repos with no activity for 60 days), the website automatically falls back to live market prices when the database ones are older than 6 hours, so prices never go stale. Just press *Enable workflow* / *Run workflow* again.

---

## Part 3 — Orders into Google Sheets · 5 min

The code in `apps-script/Code.gs` was hardened (stops spreadsheet-formula tricks, limits spam per phone number, ignores bots).
- **First time:** follow `apps-script/README.md`, paste the URL into `googleSheetWebAppUrl` in `js/config.js`.
- **You already deployed an older version:** open the script → replace the code with the new `Code.gs` → **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The URL stays the same.

---

## Part 4 — The chatbot (Gemini) · 15 min

### Where the Gemini key goes
**Only** into Supabase as a secret (never into any website file, never into GitHub).

1. Get a key: <https://aistudio.google.com/apikey> → *Create API key* (free, no card).
2. Install the Supabase CLI (<https://supabase.com/docs/guides/cli>), then in a terminal inside this folder:

```bash
supabase login
supabase link --project-ref qbndjqvtgnkcjlcatgkp
supabase secrets set GEMINI_API_KEY="PASTE_YOUR_GEMINI_KEY" \
  SB_PUBLISHABLE_KEY="sb_publishable_tJF8wLLtgU4kmTTPJjflSA_K5rmlSnr" \
  SB_SECRET_KEY="sb_secret_...your Supabase secret key..." \
  ALLOWED_ORIGINS="https://YOURDOMAIN.com,https://www.YOURDOMAIN.com"
supabase functions deploy chat --no-verify-jwt
```
`ALLOWED_ORIGINS` makes sure only **your** website can use the bot (add your `*.pages.dev` address too while testing, then re-run the `secrets set` line). `SB_SECRET_KEY` lets the daily limits survive restarts.

### Models used
| | Model | Why |
|---|---|---|
| Main | `gemini-3.5-flash-lite` | cheapest/fastest Flash model, built for high volume |
| Automatic fallback | `gemini-3.1-flash-lite` | used only if the main one hits its quota — a second quota pool |

Change either any time, no code edit: `supabase secrets set GEMINI_MODEL="..." GEMINI_FALLBACK_MODEL="..."`. If the fallback name is ever retired, pick another from <https://ai.google.dev/gemini-api/docs/models>.

### Daily message limits
There are two layers:

1. **Your protection (set by the bot, changeable):** 5 messages/minute and 40/day per visitor, and **300 chat messages/day for the whole site**. When the site-wide number is reached the bot politely sends people to WhatsApp, so you never burn the free quota. Change with `supabase secrets set CHAT_PER_MINUTE=5 CHAT_PER_DAY_PER_VISITOR=40 CHAT_DAILY_GLOBAL=300`.
2. **Google's free-tier limits:** Google doesn't publish one fixed table — each key's real per-minute/per-day numbers are shown in **AI Studio → Rate limits** (<https://aistudio.google.com/rate-limit>). Flash-Lite models get the largest free allowance. Look there once, and keep `CHAT_DAILY_GLOBAL` safely below the daily request number shown for the main model. Heads-up: on Google's free tier, prompts may be used by Google to improve its products — the bot never asks for names/phones, and you can switch the key to a paid project later with no code change.

### Teaching the bot about the shop (the simple RAG)
The bot already reads **live products and prices** from the database and only sends the 3–6 relevant pieces to Gemini. For your own facts open `supabase/functions/chat/knowledge.ts` (plain text): add the address, opening hours, delivery and exchange policy, then redeploy with the same `supabase functions deploy chat --no-verify-jwt`. The bot never states anything that isn't there — it sends the customer to WhatsApp instead. It speaks Egyptian Arabic (and English if the customer writes English) and sends product cards when someone asks for a piece.

### Test it
Open the site → chat button → ask "عايز خاتم دهب عيار 21". You should get Egyptian-Arabic text and a product card.

---

## Part 5 — Put the site online (Cloudflare Pages) · 20 min

1. **Upload the files to GitHub.** In your private repo → *Add file → Upload files* → drag in the **contents** of this folder (not the zip itself; include the hidden `.github` folder — easiest is *GitHub Desktop*: <https://desktop.github.com>, add the folder, commit, publish as **private**).
2. **Add your video.** Put your `productBG.mp4` into `assets/video/` and commit it. Keep it **under ~3 MB**: compress with
   `ffmpeg -i productBG.mp4 -vf "scale=720:-2,fps=24" -an -c:v libx264 -crf 30 -preset slow -movflags +faststart productBG.mp4.small.mp4` and use the small one renamed `productBG.mp4`. It loads *after* the page is ready and is skipped on slow/data-saver connections, so it never slows the first view.
3. Create a free account at <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
   - Framework preset: **None** · Build command: *(leave empty)* · Build output directory: **/** (or leave empty) → **Save and Deploy**.
   - You get a test address like `abohelal-site.pages.dev`. Open it and check the site, then add that address to `ALLOWED_ORIGINS` (Part 4) while testing.
4. Every time you push changes to GitHub, Cloudflare republishes automatically. (Prices and the making charge don't need a republish — they live in the database.)

*(Prefer GitHub Pages? It works too — Repo → Settings → Pages → deploy from `main` — but it can't apply the security headers in `_headers`, and a free GitHub Pages site needs a **public** repo, which exposes your admin folder name. Cloudflare Pages is recommended.)*

### Connect your domain (GoDaddy → Cloudflare)
1. Buy the domain at GoDaddy (if you haven't). 
2. In Cloudflare → **Websites → Add a domain** → enter it → choose the **Free** plan. Cloudflare shows **two nameservers**.
3. GoDaddy → **My Products → Domains → your domain → DNS → Nameservers → Change → "I'll use my own nameservers"** → paste the two Cloudflare ones → Save. (Takes minutes to a few hours.)
4. Cloudflare Pages → your project → **Custom domains → Set up a domain** → add `yourdomain.com` and `www.yourdomain.com`. HTTPS is automatic.
5. Cloudflare → **SSL/TLS → Overview → Full (strict)**, and **Edge Certificates → Always Use HTTPS = On**.
6. Cloudflare → **Rules → Redirect Rules**: redirect `www.yourdomain.com/*` → `https://yourdomain.com/$1` (301), so Google sees one address.

### Put the domain into the site
```bash
node scripts/set-domain.mjs yourdomain.com
```
(or Find & Replace `YOURDOMAIN.com` → your domain in `index.html`, `products.html`, `robots.txt`, `sitemap.xml`). Commit & push. Then update `ALLOWED_ORIGINS` (Part 4) to the real domain.

---

## Part 6 — SEO (so Google finds you) · 30 min, mostly one-time

The site already has: proper titles & descriptions, social-share cards, an Arabic `JewelryStore` data block (name, phone, Facebook, El-Mahalla), `sitemap.xml`, `robots.txt`, fast loading, and mobile-friendly pages. What only **you** can do:

1. **Google Search Console** (<https://search.google.com/search-console>) → add `yourdomain.com` as a *Domain* property → verify with the DNS record it gives you (add it in Cloudflare DNS) → **Sitemaps → add `sitemap.xml`**.
2. **Google Business Profile** (<https://business.google.com>) — *the most important step for "محلات دهب المحلة الكبرى" searches*: create the shop listing with the exact address, phone **+20 106 567 6771**, opening hours, category *Jewelry store*, photos, and the website link. Ask happy customers for reviews.
3. **Facebook page:** put the website address in the page's *Website* field and *About*, pin a post linking to the site, and share new pieces with a link to `yourdomain.com/products`. Keep the **same name, phone and area** everywhere (Facebook, Google, site) — consistency is a local-SEO signal.
4. **Words people really search:** "ذهب المحلة الكبرى", "دبل ذهب", "خاتم ذهب عيار 21", "سعر جرام الذهب اليوم". Use them naturally in product names/descriptions in the admin (e.g. "خاتم سوليتير ذهب عيار 21"). Short, accurate descriptions beat long ones.
5. **Add real facts** when you have them: send me the Facebook "About" details (address, hours) and add them to `knowledge.ts` and the `address` block in `index.html`'s JSON-LD — Google likes complete business data.
6. **Check speed** at <https://pagespeed.web.dev> after launch. Aim for green on mobile; tell me the score if it isn't.

---

## Part 7 — Security checklist (before you announce the site)

- [ ] Admin password is long and unique; `create_admin.sql` with the real password is **not** saved in the repo.
- [ ] Repo is **Private**; Supabase **secret** key and Gemini key exist only as secrets (GitHub / Supabase), never in files.
- [ ] `https://yourdomain.com/admin` and `/admin.html` show the 404 page.
- [ ] **Lockout test:** open the secret admin address in a private window and enter a wrong password 4 times → it must lock for 30 minutes. (If it never locks, tell me — it means Supabase isn't passing the visitor IP.) Then log in with the right password once the lock ends, or run the "unlock" line in `create_admin.sql`.
- [ ] Browser developer tools → no red errors on the home page; the padlock shows on the domain.
- [ ] `ALLOWED_ORIGINS` contains only your real domain(s).
- [ ] Supabase → **Authentication → Providers**: leave sign-ups unused; Supabase → *Database → Tables*: every table shows **RLS enabled**.

What's built in: strict Content-Security-Policy and other security headers (`_headers`), HTML-escaping of product text, server-side login throttling with hashed passwords (bcrypt) and expiring tokens, auto-logout after 30 idle minutes, the admin page marked `noindex` and kept out of `robots.txt`/sitemap, bot-trap + validation on orders, chatbot rate limits + origin lock. Honest note: a secret admin address is only a *speed bump* — the real protection is the strong password + lockout + private repo.

---

## Part 8 — Daily use

| I want to… | Do this |
|---|---|
| Change the making charge | Admin → **Prices & making charge** → edit → Save. Site and bot update immediately. |
| Add / edit / hide a product | Admin → **Products**. Photos: upload to Google Drive → *Anyone with the link: Viewer* → paste the link (first = main photo). |
| Change the admin address | Rename the folder `vBZM31AZC3g6eRTdWCRB` to any new random 20+ letters/numbers **and** the same text in `_headers` (and `tests/site.test.py` if you run tests); commit & push. |
| Change phone / Facebook | `js/config.js` (and the phone in the JSON-LD block of `index.html`). |
| Teach the bot something | `supabase/functions/chat/knowledge.ts` → redeploy the function. |
| Reset the admin password | Run `database/create_admin.sql` again with the new one (it also signs everyone out). |

---

## Troubleshooting
- **Prices show "—" or products missing:** run the *Update gold price* Action once (Part 2); check `gold_prices` has numbers.
- **Admin says "تعذّر الاتصال":** check `supabaseUrl`/`supabaseAnonKey` in `js/config.js` and that `upgrade_v2.sql` ran without errors.
- **Admin login always says wrong password:** re-run `create_admin.sql`; names are case-insensitive, passwords are not.
- **Chat says busy / no reply:** the daily cap or Google quota is used up — it resets daily; raise `CHAT_DAILY_GLOBAL` only if Google's limit (AI Studio) allows.
- **Chat blocked in the browser (403):** add your exact site address to `ALLOWED_ORIGINS` and run `supabase secrets set` again.
- **Changed a CSS/JS file but the site looks the same:** hard-refresh (Ctrl+Shift+R); images are cached for 30 days, so give a replaced image a new file name.
- **No background video on Products:** the file must be exactly `assets/video/productBG.mp4`. The page works fine without it.
