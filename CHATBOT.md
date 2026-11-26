# Sales chatbot — setup, testing, limits

The chat button appears bottom-right on every page. Customers write in Arabic (Egyptian) or English;
the assistant answers from **live database data** and shows real product cards.

## How it works (and why it costs $0)
```
Browser (GitHub Pages)  ──►  Supabase Edge Function "chat"  ──►  Gemini API (free tier)
 js/chatbot.js                 supabase/functions/chat/           key stored as a server secret
                                 │ reads current products from products_priced (public view)
                                 │ reads today's gram prices from your site's data/gold.json
                                 └ price = grams × gram price + grams × 500   (same formula as js/products.js)
```
* GitHub Pages cannot run server code, so the Gemini key lives in a **Supabase Edge Function** (free plan, same
  project you already use). The key is never in the website files or on GitHub.
* No product list or price is written anywhere in the chatbot. Change a product or the gram price → the next
  answer uses it. Only the 3–6 products relevant to the question are sent to Gemini, never the whole catalog.
* Models: `gemini-3.5-flash-lite` (main) and `gemini-3.1-flash-lite` (automatic fallback if the first is
  rate-limited). Change them any time with the env vars below — no code change.

## One-time setup (≈10 minutes)
1. **Gemini key (free):** https://aistudio.google.com/apikey → create key (no card needed).
2. **Database:** Supabase → SQL Editor → paste & run `database/chatbot_rate_limit.sql`
   (creates one private counter table; touches nothing else).
3. **Install the Supabase CLI** and log in: https://supabase.com/docs/guides/cli  → `supabase login`
4. **Link & set secrets** (run in this project folder; the publishable key is the same public one in `js/config.js`):
```bash
supabase link --project-ref qbndjqvtgnkcjlcatgkp
supabase secrets set \
  GEMINI_API_KEY="PASTE_YOUR_GEMINI_KEY" \
  SB_PUBLISHABLE_KEY="sb_publishable_tJF8wLLtgU4kmTTPJjflSA_K5rmlSnr" \
  SITE_BASE_URL="https://YOUR-USER.github.io/YOUR-REPO" \
  ALLOWED_ORIGINS="https://YOUR-USER.github.io"
```
   (Custom domain? use it in `SITE_BASE_URL` / `ALLOWED_ORIGINS` instead. Use the origin only — no path.)
5. **Optional but recommended** — lets the rate limiter write its counters (Supabase dashboard → Project Settings →
   API Keys → copy the **secret** key):
```bash
supabase secrets set SB_SECRET_KEY="sb_secret_...."
```
   Without it the limiter still works but only in memory (weaker; resets when the function restarts).
6. **Deploy:**
```bash
supabase functions deploy chat --no-verify-jwt
```
7. Push the website files to GitHub as usual. Done — `js/config.js → chatApiUrl` already points at
   `https://qbndjqvtgnkcjlcatgkp.supabase.co/functions/v1/chat`.

## Environment variables (all server-side, set with `supabase secrets set`)
| Name | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | yes | – | Google AI Studio key |
| `SB_PUBLISHABLE_KEY` | yes* | – | the public key from `js/config.js` (*or auto `SUPABASE_ANON_KEY`) |
| `SITE_BASE_URL` | yes | – | where `data/gold.json` is served (same prices as the site) |
| `ALLOWED_ORIGINS` | strongly | any | comma-separated site origins allowed to call the chat |
| `SB_SECRET_KEY` | recommended | – | persistent rate-limit counters |
| `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` | no | `gemini-3.5-flash-lite` / `gemini-3.1-flash-lite` | model names |
| `CHAT_PER_MINUTE` / `CHAT_PER_DAY_PER_VISITOR` / `CHAT_DAILY_GLOBAL` | no | 5 / 40 / 300 | abuse limits |
| `MAX_MESSAGE_CHARS`, `MAX_HISTORY_TURNS`, `MAX_PRODUCTS_CONTEXT`, `MAX_OUTPUT_TOKENS` | no | 500 / 6 / 6 / 700 | size limits |
| `WORKMANSHIP_GOLD` / `WORKMANSHIP_SILVER` | no | 500 / 500 | only if you change `workmanshipPerGram` in `js/config.js` |

## Testing
* Local, no internet needed: `node --experimental-strip-types tests/chat-backend.test.mjs` (29 backend checks).
* UI (needs Playwright): start `python3 -m http.server 8000` and `node --experimental-strip-types tests/dev-chat-server.mjs`,
  then `python3 tests/chat-ui.test.py` (50 browser checks: desktop, phone, tablet).
* Live: open the site → click the button → ask "عايز خاتم دهب عيار 21". Compare the price on the card with the same
  product on products.html — they must match. Then change a product's weight in the admin page and ask again.
* Quick server check: `curl -X POST https://qbndjqvtgnkcjlcatgkp.supabase.co/functions/v1/chat -H "Origin: https://YOUR-USER.github.io" -H "content-type: application/json" -d '{"message":"hello"}'`
* Logs: Supabase dashboard → Edge Functions → chat → Logs (the function logs error codes only, never customer text).

## Limits you should know
* **Free-tier quotas are Google's and change.** Check your real numbers at https://aistudio.google.com/rate-limit and
  lower `CHAT_DAILY_GLOBAL` if your limit is below 300/day. At ~30 messages/day you are far inside any published limit.
  When a model's quota is gone the bot switches to the fallback model, then shows a friendly "busy → WhatsApp" message.
* **Free-tier prompts may be used by Google to improve its products.** Customers should not be asked for personal data
  in chat (the bot tells them to order via the cart / WhatsApp).
* **No stock data exists in your database** (only "shown on website"). The bot therefore never claims stock; it says
  the team confirms availability on WhatsApp. If you add a stock column later, tell me and I'll expose it.
* `goldPriceOverride` / `silverPriceOverride` in `js/config.js` are browser-side only; if you ever use them the chatbot
  will not see them (it uses `data/gold.json`, or the same live fallback the site uses).
* Product "View" opens `products.html?p=<id>` (scrolls to and highlights the product) — the site has no separate
  per-product page.
* Edge Functions on the Supabase free plan have monthly invocation limits (500k) — irrelevant at this volume.
