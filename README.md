# Gamal Abo Hel'al — website

Static website (HTML/CSS/JS) + Supabase (database, admin API, chatbot function) + Gemini (chatbot) + Google Sheet (orders).

**Start with [DEPLOY.md](DEPLOY.md)** — the complete step-by-step guide.

| Folder / file | What it is |
|---|---|
| `index.html`, `products.html` | the two public pages |
| `vBZM31AZC3g6eRTdWCRB/` | the **secret admin page** (rename the folder to your own random code — see DEPLOY.md) |
| `css/`, `js/`, `assets/` | styles (`premium.css` = the new look), scripts, images |
| `js/config.js` | phone, Facebook, Supabase keys (public ones only) |
| `database/` | SQL you paste into Supabase: `schema.sql` (new), `upgrade_v2.sql` (existing), `create_admin.sql`, `chatbot_rate_limit.sql` |
| `supabase/functions/chat/` | the chatbot; edit `knowledge.ts` to teach it about the shop |
| `apps-script/` | Google Sheet order receiver |
| `scripts/`, `.github/workflows/` | automatic gold/silver price update, domain helper |
| `_headers`, `robots.txt`, `sitemap.xml`, `404.html`, `manifest.webmanifest` | security headers + SEO files |
| `tests/` | automated tests (optional) |

**Price rule:** `price = (weight × today's gram price) + (weight × making charge)`. The making charge (was a fixed 500) is edited in the admin page → *Prices*.
