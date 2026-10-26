// Local test harness: runs the REAL backend code (supabase/functions/chat/core.ts) on http://localhost:8787
// with fake Supabase + fake Gemini upstreams (this sandbox has no internet). Prices use the site's real data/gold.json.
// Run:  node --experimental-strip-types tests/dev-chat-server.mjs
import http from "node:http";
import { handleChat } from "../supabase/functions/chat/core.ts";

const UUID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const CATS = [
  { slug: "ring", name_ar: "خواتم", name_en: "Rings" }, { slug: "necklace", name_ar: "سلاسل", name_en: "Chains & Necklaces" },
  { slug: "bracelet", name_ar: "أساور", name_en: "Bracelets" },
];
export const ROWS = [
  { id: UUID(1), category: "ring", metal: "gold", karat: 21, gms: 5, name_ar: "خاتم سوليتير", name_en: "Solitaire Ring", desc_ar: "خاتم كلاسيك", desc_en: "Classic ring", image_url: "", images: [], created_at: "2026-10-01" },
  { id: UUID(2), category: "ring", metal: "gold", karat: 18, gms: 3, name_ar: "خاتم فراشة", name_en: "Butterfly Ring", desc_ar: "", desc_en: "", image_url: "", images: [], created_at: "2026-10-02" },
  { id: UUID(3), category: "necklace", metal: "gold", karat: 21, gms: 10, name_ar: "سلسلة كابل", name_en: "Cable Chain", desc_ar: "", desc_en: "", image_url: "", images: [], created_at: "2026-10-03" },
  { id: UUID(4), category: "bracelet", metal: "silver", karat: 925, gms: 12, name_ar: "إسورة فضة", name_en: "Silver Bracelet", desc_ar: "", desc_en: "", image_url: "", images: [], created_at: "2026-10-04" },
];
const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
const real = fetch;

async function upstream(input, init = {}) {
  const url = String(input);
  if (url.startsWith("https://sb.test/rest/v1/categories")) return J(CATS);
  if (url.startsWith("https://sb.test/rest/v1/products_priced")) {
    const u = new URL(url); let rows = [...ROWS];
    const cat = u.searchParams.get("category"); if (cat) rows = rows.filter((r) => cat.slice(4, -1).split(",").includes(r.category));
    const m = u.searchParams.get("metal"); if (m) rows = rows.filter((r) => r.metal === m.slice(3));
    const k = u.searchParams.get("karat"); if (k) rows = rows.filter((r) => String(r.karat) === k.slice(3));
    const id = u.searchParams.get("id"); if (id) rows = rows.filter((r) => id.slice(4, -1).split(",").includes(r.id));
    return J(rows);
  }
  if (url.includes("/rpc/chat_rate_hit")) return J(true);
  if (url.startsWith("http://localhost:8000/")) return real(url);                         // the website's real data/gold.json
  if (url.includes("generativelanguage.googleapis.com")) {                                  // fake Gemini: answers from the retrieved data
    const sys = JSON.parse(init.body).systemInstruction.parts[0].text;
    const lines = sys.split("\n").filter((l) => /^\[P\d+\]/.test(l));
    if (!lines.length) return J({ candidates: [{ content: { parts: [{ text: "أهلاً بيك! تحب تدور على إيه؟" }] } }] });
    const pick = lines.slice(0, 2).map((l) => l.split("|")[0].replace(/^\[P\d+\]\s*/, "").trim() + " — " + (l.match(/price: ([^|]+)/) || [, "؟"])[1].trim());
    const ids = lines.slice(0, 2).map((l) => l.match(/^\[(P\d+)\]/)[1]).join(",");
    return J({ candidates: [{ content: { parts: [{ text: "رشحتلك:\n- **" + pick.join("**\n- **") + "**\nتحب أضيف واحدة للسلة؟\n[[show: " + ids + "]]" }] } }] });
  }
  return J({}, 404);
}
const E = { GEMINI_API_KEY: "fake", SUPABASE_URL: "https://sb.test", SB_PUBLISHABLE_KEY: "pk", SB_SECRET_KEY: "sk", SITE_BASE_URL: "http://localhost:8000" };
const env = { get: (k) => E[k] };

http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const r = new Request("http://localhost:8787" + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) });
  const out = await handleChat(r, env, { fetch: upstream });
  res.writeHead(out.status, Object.fromEntries(out.headers)); res.end(Buffer.from(await out.arrayBuffer()));
}).listen(8787, () => console.log("chat backend (real code, fake upstreams) on :8787"));
