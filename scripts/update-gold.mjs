// Fetches today's gold + silver price per gram in EGP and writes it into the database (gold_prices table)
// through the set_metal_prices() function. Run by .github/workflows/update-gold.yml every 30 minutes.
//   24k gold  = XAU/USD per troy ounce / 31.1035 * USD->EGP ; 21k = x0.875 ; 18k = x0.75
//   pure silver (999) = XAG/USD per troy ounce / 31.1035 * USD->EGP ; 925 = x925/999 ; 800 = x800/999
// Needs two secrets (GitHub -> Settings -> Secrets and variables -> Actions): SUPABASE_URL and SUPABASE_SECRET_KEY.
const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${u} -> ${r.status}`); return r.json(); };
const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY secrets");

const gold = await get("https://api.gold-api.com/price/XAU");
const silver = await get("https://api.gold-api.com/price/XAG");
const fx = await get("https://open.er-api.com/v6/latest/USD");
const usdG = Number(gold.price), usdS = Number(silver.price), egp = Number(fx.rates && fx.rates.EGP);
if (!(usdG > 0) || !(usdS > 0) || !(egp > 0)) throw new Error("Bad market data " + JSON.stringify({ usdG, usdS, egp }));

const r2 = (n) => Math.round(n * 100) / 100;
const g24 = (usdG / 31.1035) * egp, s999 = (usdS / 31.1035) * egp;
const prices = { 24: r2(g24), 21: r2(g24 * 0.875), 18: r2(g24 * 0.75), 999: r2(s999), 925: r2((s999 * 925) / 999), 800: r2((s999 * 800) / 999) };

// sanity guard: refuse absurd numbers instead of publishing them
if (prices[21] < 500 || prices[21] > 200000 || prices[925] < 1 || prices[925] > 20000) throw new Error("Prices look wrong, not saving: " + JSON.stringify(prices));

const headers = { "content-type": "application/json", apikey: SUPABASE_SECRET_KEY };
if (/^eyJ/.test(SUPABASE_SECRET_KEY)) headers.Authorization = "Bearer " + SUPABASE_SECRET_KEY;   // legacy service_role JWT keys only
const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc/set_metal_prices`, { method: "POST", headers, body: JSON.stringify({ p: prices }) });
if (!res.ok) throw new Error(`Saving failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
console.log("Saved", prices);
