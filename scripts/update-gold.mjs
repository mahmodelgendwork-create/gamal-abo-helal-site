// Writes data/gold.json with today's gold price per gram in EGP.
// 24k = XAU/USD per troy ounce / 31.1035 * USD->EGP ; 21k = *0.875 ; 18k = *0.75
import { writeFileSync, mkdirSync } from "node:fs";
const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${u} -> ${r.status}`); return r.json(); };
const gold = await get("https://api.gold-api.com/price/XAU");
const fx = await get("https://open.er-api.com/v6/latest/USD");
const usd = Number(gold.price), egp = Number(fx.rates && fx.rates.EGP);
if (!(usd > 0) || !(egp > 0)) throw new Error("Bad market data " + JSON.stringify({ usd, egp }));
const g24 = (usd / 31.1035) * egp, r2 = (n) => Math.round(n * 100) / 100;
const out = { updated: new Date().toISOString(), source: "gold-api.com XAU x open.er-api.com EGP",
  prices: { 24: r2(g24), 21: r2(g24 * 0.875), 18: r2(g24 * 0.75) } };
mkdirSync("data", { recursive: true });
writeFileSync("data/gold.json", JSON.stringify(out, null, 2) + "\n");
console.log(out);
