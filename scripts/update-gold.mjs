// Fetches the live gold price and writes EGP/gram per karat into the database.
// Runs on GitHub Actions every 30 minutes (see .github/workflows/update-gold.yml).
// price/gram(24k) = XAU/USD per troy ounce / 31.1035 * USD->EGP ; 21k = *0.875 ; 18k = *0.75
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY secrets");

const H = { apikey: SUPABASE_SERVICE_KEY, "Content-Type": "application/json" };
if (/^eyJ/.test(SUPABASE_SERVICE_KEY)) H.Authorization = `Bearer ${SUPABASE_SERVICE_KEY}`; // legacy JWT service_role key only
const get = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} -> ${r.status}`); return r.json(); };

const sr = await fetch(`${SUPABASE_URL}/rest/v1/gold_settings?select=auto_update&id=eq.1`, { headers: H });
const [row] = await sr.json();
if (row && row.auto_update === false) { console.log("Auto update is OFF (manual prices). Skipping."); process.exit(0); }

const gold = await get("https://api.gold-api.com/price/XAU");
const fx = await get("https://open.er-api.com/v6/latest/USD");
const usdPerOunce = Number(gold.price), egp = Number(fx.rates && fx.rates.EGP);
if (!(usdPerOunce > 0) || !(egp > 0)) throw new Error("Bad market data: " + JSON.stringify({ usdPerOunce, egp }));

const g24 = (usdPerOunce / 31.1035) * egp;
const rows = [24, 21, 18].map((k) => ({
  karat: k,
  price_per_gram: Math.round(g24 * (k / 24) * 100) / 100,
  source: "auto: gold-api.com XAU x open.er-api.com EGP",
  updated_at: new Date().toISOString()
}));

const res = await fetch(`${SUPABASE_URL}/rest/v1/gold_prices?on_conflict=karat`, {
  method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(rows)
});
if (!res.ok) throw new Error(`Supabase write failed: ${res.status} ${await res.text()}`);
console.log("Updated:", rows.map((r) => `${r.karat}k=${r.price_per_gram}`).join("  "));
