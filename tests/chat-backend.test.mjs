// Run:  node --experimental-strip-types tests/chat-backend.test.mjs
// Simulates Supabase REST, the website's gold.json and Gemini, then exercises the real backend code.
import assert from "node:assert/strict";
import { handleChat, analyse, normAr } from "../supabase/functions/chat/core.ts";

const UUID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const CATS = [
  { slug: "ring", name_ar: "خواتم", name_en: "Rings" }, { slug: "necklace", name_ar: "سلاسل", name_en: "Chains & Necklaces" },
  { slug: "bracelet", name_ar: "أساور", name_en: "Bracelets" }, { slug: "pendant", name_ar: "دلايات", name_en: "Pendants" },
  { slug: "wedding-band", name_ar: "دبل وخواتم زواج", name_en: "Wedding Bands" },
];
let ROWS = [
  { id: UUID(1), category: "ring", metal: "gold", karat: 21, gms: 5, name_ar: "خاتم سوليتير", name_en: "Solitaire Ring", desc_ar: "خاتم كلاسيك", desc_en: "Classic ring", image_url: "", images: ["https://drive.google.com/file/d/AAAAAAAAAAAA/view"], created_at: "2026-10-01" },
  { id: UUID(2), category: "ring", metal: "gold", karat: 18, gms: 3, name_ar: "خاتم فراشة", name_en: "Butterfly Ring", desc_ar: "", desc_en: "", image_url: "", images: [], created_at: "2026-10-02" },
  { id: UUID(3), category: "necklace", metal: "gold", karat: 21, gms: 10, name_ar: "سلسلة كابل", name_en: "Cable Chain", desc_ar: "", desc_en: "", image_url: "", images: [], created_at: "2026-10-03" },
  { id: UUID(4), category: "bracelet", metal: "silver", karat: 925, gms: 12, name_ar: "إسورة فضة", name_en: "Silver Bracelet", desc_ar: "", desc_en: "", image_url: "", images: [], created_at: "2026-10-04" },
];
let GOLD = { updated: new Date().toISOString(), prices: { 18: 5000, 21: 6000, 24: 7000 }, silver: { 999: 100, 925: 90, 800: 80 } };

const log = { gemini: [], rpc: [], rest: [] };
let geminiMode = "ok";   // ok | quota_primary | quota_all | marker_bad
let rpcMode = "db";      // db | down
const counters = new Map();

const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

async function mockFetch(input, init = {}) {
  const url = String(input);
  if (url.startsWith("https://site.test/data/gold.json")) return J(GOLD);
  if (url.startsWith("https://sb.test/rest/v1/categories")) return J(CATS);
  if (url.startsWith("https://sb.test/rest/v1/products_priced")) {
    log.rest.push(url);
    const u = new URL(url); let rows = [...ROWS];
    const cat = u.searchParams.get("category"); if (cat) { const l = cat.slice(4, -1).split(","); rows = rows.filter((r) => l.includes(r.category)); }
    const m = u.searchParams.get("metal"); if (m) rows = rows.filter((r) => r.metal === m.replace("eq.", ""));
    const k = u.searchParams.get("karat"); if (k) rows = rows.filter((r) => String(r.karat) === k.replace("eq.", ""));
    const id = u.searchParams.get("id"); if (id) { const l = id.slice(4, -1).split(","); rows = rows.filter((r) => l.includes(r.id)); }
    return J(rows);
  }
  if (url.startsWith("https://sb.test/rest/v1/rpc/chat_rate_hit")) {
    if (rpcMode === "down") return J({ message: "x" }, 500);
    const b = JSON.parse(init.body); log.rpc.push(b);
    const n = (counters.get(b.p_bucket) || 0) + 1; counters.set(b.p_bucket, n);
    return J(n <= b.p_limit);
  }
  if (url.startsWith("https://generativelanguage.googleapis.com/")) {
    const model = url.split("/models/")[1].split(":")[0];
    const body = JSON.parse(init.body);
    log.gemini.push({ model, key: init.headers["x-goog-api-key"], system: body.systemInstruction.parts[0].text, contents: body.contents, url });
    if (geminiMode === "quota_all" || (geminiMode === "quota_primary" && model === "gemini-3.5-flash-lite")) return J({ error: { status: "RESOURCE_EXHAUSTED" } }, 429);
    const text = geminiMode === "marker_bad" ? "Here you go. [[show: P1, P9, P1, P2, P3, P4]]" : "عندنا خاتم سوليتير ذهب عيار 21 هيعجبك.\n[[show: P1]]";
    return J({ candidates: [{ content: { parts: [{ text }] } }] });
  }
  throw new Error("unexpected fetch " + url);
}

const ENV = {
  GEMINI_API_KEY: "SECRET-GEMINI-KEY-123", SUPABASE_URL: "https://sb.test", SB_PUBLISHABLE_KEY: "sb_publishable_x", SB_SECRET_KEY: "sb_secret_y",
  SITE_BASE_URL: "https://site.test", ALLOWED_ORIGINS: "https://shop.example.com",
};
const env = (over = {}) => { const e = { ...ENV, ...over }; return { get: (k) => e[k] }; };
const post = (body, headers = {}) => new Request("https://sb.test/functions/v1/chat", {
  method: "POST", headers: { "content-type": "application/json", origin: "https://shop.example.com", "x-forwarded-for": "1.2.3.4", ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body),
});
let clock = Date.now();   // moves forward so the 2-minute gold-price cache never hides a change
const call = (body, over, headers) => { clock += 10 * 60_000; return handleChat(post(body, headers), env(over), { fetch: mockFetch, now: () => clock }); };
const callFrozen = (body, over, headers) => handleChat(post(body, headers), env(over), { fetch: mockFetch, now: () => 1_800_000_000_000 });   // same minute/day for every call
let passed = 0;
const t = async (name, fn) => { counters.clear(); log.gemini.length = 0; log.rpc.length = 0; log.rest.length = 0; geminiMode = "ok"; rpcMode = "db"; await fn(); passed++; console.log("  ✓", name); };

console.log("Arabic understanding");
await t("normAr unifies spellings and digits", () => {
  assert.equal(normAr("ذهب"), normAr("دهب")); assert.equal(normAr("أسورة"), normAr("اسوره")); assert.equal(normAr("عيار ٢١"), "عيار 21"); assert.equal(normAr("٣٠,٠٠٠"), "30000");
});
await t("'عايز خاتم دهب عيار 21 تحت 30 الف'", () => {
  const s = analyse("عايز خاتم دهب عيار 21 تحت 30 الف", CATS);
  assert.deepEqual(s.categories, ["ring"]); assert.equal(s.metal, "gold"); assert.equal(s.karat, 21); assert.equal(s.budget.max, 30000);
});
await t("budget '21k' is not read as 21 karat", () => {
  const s = analyse("rings under 21k EGP", CATS); assert.equal(s.karat, null); assert.equal(s.budget.max, 21000);
});
await t("'21k gold chain' IS karat", () => { const s = analyse("21k gold chain", CATS); assert.equal(s.karat, 21); assert.deepEqual(s.categories, ["necklace"]); });
await t("Egyptian forms: سلسلة / أساور فضة / دبلة", () => {
  assert.deepEqual(analyse("عايزة سلسلة", CATS).categories, ["necklace"]);
  const a = analyse("اساور فضه", CATS); assert.deepEqual(a.categories, ["bracelet"]); assert.equal(a.metal, "silver");
  assert.deepEqual(analyse("بكام الدبلة", CATS).categories, ["wedding-band"]);
});
await t("'how do I order' triggers no product search", async () => {
  const s = analyse("ازاي اطلب من الموقع؟", CATS); assert.equal(s.categories.length + (s.metal ? 1 : 0) + (s.karat ? 1 : 0), 0);
});

console.log("Live data & prices");
await t("price = grams x gram price + grams x 500, from live gold.json", async () => {
  const r = await call({ message: "عايز خاتم ذهب عيار 21" }); const j = await r.json();
  assert.equal(r.status, 200); assert.equal(j.ok, true);
  assert.equal(j.products[0].id, UUID(1));
  assert.equal(j.products[0].price, 5 * 6000 + 5 * 500);   // 32,500
  assert.ok(log.gemini[0].system.includes("[P1]")); assert.ok(log.gemini[0].system.includes("٣٢٬٥٠٠"));
});
await t("changing the gram price changes the answer with no code/knowledge-file change", async () => {
  const before = await (await call({ message: "ring 21k price" })).json();
  GOLD = { ...GOLD, prices: { 18: 5000, 21: 7000, 24: 8000 } };
  const after = await (await call({ message: "ring 21k price" })).json();
  GOLD = { ...GOLD, prices: { 18: 5000, 21: 6000, 24: 7000 } };
  assert.equal(before.products[0].price, 32500);                    // 5 g x 6000 + 5 g x 500
  assert.equal(after.products[0].price, 37500);                     // 5 g x 7000 + 5 g x 500 — new gram price, same code
  assert.ok(log.gemini[0].system.includes("32,500") && log.gemini[1].system.includes("37,500"));   // English chat → English number format
});
await t("edited product weight is reflected immediately (no cache of products)", async () => {
  ROWS[0].gms = 6;
  await call({ message: "خاتم عيار 21" });
  ROWS[0].gms = 5;
  assert.ok(log.gemini[0].system.includes("٣٩٬٠٠٠"));   // 6 g x 6000 + 6 g x 500
  assert.ok(log.gemini[0].system.includes("weight: 6 g"));
});
await t("only relevant products are sent to Gemini (not the catalog)", async () => {
  await call({ message: "عايز اسورة فضة" });
  const sys = log.gemini[0].system; assert.ok(sys.includes("إسورة فضة")); assert.ok(!sys.includes("سلسلة كابل")); assert.ok(!sys.includes("خاتم سوليتير"));
});
await t("no match → honest 'closest' note, no invented items", async () => {
  await call({ message: "عايز خاتم دهب عيار 24" });
  assert.ok(log.gemini[0].system.includes("no exact match"));
});
await t("budget with nothing inside it → honest note", async () => {
  await call({ message: "خاتم تحت 5000 جنيه" });
  assert.ok(log.gemini[0].system.includes("nothing listed fits"));
});
await t("follow-up uses context_ids to find 'the second one'", async () => {
  await call({ message: "والتاني بكام؟", context_ids: [UUID(3)], history: [{ role: "assistant", text: "عندنا سلسلة" }] });
  assert.ok(log.gemini[0].system.includes("سلسلة كابل"));
});
await t("gold.json missing → price NOT CONFIRMED, never guessed", async () => {
  const bad = async (u, i) => (String(u).includes("gold.json") || String(u).includes("er-api") || String(u).includes("gold-api") || String(u).includes("gold_prices") ? J({}, 500) : mockFetch(u, i));
  // fresh module state is not possible; use a clock far in the future to expire the 2-min cache
  const r = await handleChat(post({ message: "خاتم ذهب عيار 21" }, { "x-forwarded-for": "7.7.7.7" }), env(), { fetch: bad, now: () => (clock += 10 * 60_000) });
  const j = await r.json(); assert.equal(j.products[0].price, null); assert.ok(log.gemini.at(-1).system.includes("NOT CONFIRMED") || log.gemini.at(-1).system.includes("unavailable"));
});

console.log("Answer & cards");
await t("cards come only from retrieved products; bad/duplicate ids dropped; max 3", async () => {
  geminiMode = "marker_bad";
  const j = await (await call({ message: "عايز خاتم" })).json();
  assert.ok(j.products.length <= 3); assert.ok(j.products.every((p) => ROWS.some((r) => r.id === p.id)));
  assert.equal(new Set(j.products.map((p) => p.id)).size, j.products.length); assert.ok(!j.reply.includes("[["));
});
await t("card carries the data the UI needs", async () => {
  const j = await (await call({ message: "عايز خاتم دهب عيار 21" })).json(); const p = j.products[0];
  assert.deepEqual(Object.keys(p).sort(), ["category", "categorySlug", "gms", "id", "image", "karat", "metal", "name", "price"]);
  assert.equal(p.category.ar, "خواتم"); assert.ok(p.image.includes("drive.google.com"));
});

console.log("Security & limits");
await t("Gemini key never appears in any response; sent only to Google in a header", async () => {
  const r = await call({ message: "عايز خاتم" }); const txt = await r.text();
  assert.ok(!txt.includes("SECRET-GEMINI-KEY")); assert.equal(log.gemini[0].key, "SECRET-GEMINI-KEY-123"); assert.ok(!log.gemini[0].url.includes("SECRET"));
});
await t("system prompt contains no admin/internal info", async () => {
  await call({ message: "عايز خاتم" });
  const sys = log.gemini[0].system.toLowerCase();
  for (const bad of ["admin-", "admin.html", "password", "service_role", "sb_secret", "supabase.co", "secret-gemini", "api key"]) assert.ok(!sys.includes(bad), bad);
});
await t("wrong origin → 403 and Gemini is never called", async () => {
  const r = await call({ message: "hi" }, {}, { origin: "https://evil.example" }); assert.equal(r.status, 403); assert.equal(log.gemini.length, 0);
});
await t("CORS preflight works for the allowed site", async () => {
  const r = await handleChat(new Request("https://sb.test/functions/v1/chat", { method: "OPTIONS", headers: { origin: "https://shop.example.com" } }), env(), { fetch: mockFetch });
  assert.equal(r.status, 204); assert.equal(r.headers.get("access-control-allow-origin"), "https://shop.example.com");
});
await t("validation: bad JSON, missing/empty/too-long message", async () => {
  assert.equal((await call("{nope")).status, 400); assert.equal((await call({ message: 5 })).status, 400); assert.equal((await call({ message: "   " })).status, 400);
  const long = await call({ message: "ا".repeat(501) }); assert.equal(long.status, 400); assert.equal((await long.json()).code, "too_long");
  assert.equal((await call({ message: "x".repeat(20000) })).status, 413); assert.equal(log.gemini.length, 0);
});
await t("history is capped to 6 turns and 600 chars each", async () => {
  const history = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: "ر".repeat(900) + i }));
  await call({ message: "ازيك", history });
  const c = log.gemini[0].contents; assert.ok(c.length <= 7); assert.ok(c.every((x) => x.parts[0].text.length <= 1300)); assert.equal(c[0].role, "user"); assert.equal(c.at(-1).role, "user");
});
await t("per-minute limit → 429 with friendly Arabic message; Gemini not called", async () => {
  let last; for (let i = 0; i < 7; i++) last = await callFrozen({ message: "ازيك" }, { CHAT_PER_MINUTE: "5" });
  assert.equal(last.status, 429); const j = await last.json(); assert.equal(j.code, "rate_limited"); assert.ok(/[\u0600-\u06FF]/.test(j.message)); assert.equal(log.gemini.length, 5);
});
await t("global daily cap → friendly 'busy' + WhatsApp flag (free quota protected)", async () => {
  let last; for (let i = 0; i < 4; i++) last = await callFrozen({ message: "ازيك" }, { CHAT_DAILY_GLOBAL: "3" }, { "x-forwarded-for": "10.0." + i + ".1" });
  assert.equal(last.status, 503); const j = await last.json(); assert.equal(j.code, "busy"); assert.equal(j.whatsapp, true); assert.equal(log.gemini.length, 3);
});
await t("rate-limit store down → falls back to in-memory limiter (still limited)", async () => {
  rpcMode = "down"; let last; for (let i = 0; i < 4; i++) last = await callFrozen({ message: "hello" }, { CHAT_PER_MINUTE: "2" }, { "x-forwarded-for": "55.5.5.5" });
  assert.equal(last.status, 429);
});

console.log("Gemini failures");
await t("primary model quota → automatically uses fallback model", async () => {
  geminiMode = "quota_primary"; const j = await (await call({ message: "عايز خاتم" })).json();
  assert.equal(j.ok, true); assert.deepEqual(log.gemini.map((g) => g.model), ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]);
});
await t("all quota exhausted → friendly message in the customer's language", async () => {
  geminiMode = "quota_all";
  const ar = await call({ message: "عايز خاتم" }); assert.equal(ar.status, 503); const a = await ar.json(); assert.equal(a.code, "busy"); assert.ok(/[\u0600-\u06FF]/.test(a.message)); assert.equal(a.whatsapp, true);
  const en = await call({ message: "I want a ring" }, {}, { "x-forwarded-for": "8.8.8.8" }); const e = await en.json(); assert.ok(/busy/i.test(e.message)); assert.ok(!JSON.stringify(e).includes("RESOURCE_EXHAUSTED"));
});
await t("model names are configurable by environment variables", async () => {
  await call({ message: "عايز خاتم" }, { GEMINI_MODEL: "my-model", GEMINI_FALLBACK_MODEL: "" }); assert.equal(log.gemini[0].model, "my-model");
});
await t("missing server secrets → graceful error, no crash", async () => {
  const r = await call({ message: "hi" }, { GEMINI_API_KEY: "" }); assert.equal(r.status, 503); assert.equal((await r.json()).code, "error");
});

console.log(`\n${passed} backend tests passed`);
