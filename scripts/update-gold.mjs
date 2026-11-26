// Writes data/gold.json with today's gold AND silver price per gram in EGP.
// 24k gold = XAU/USD per troy ounce / 31.1035 * USD->EGP ; 21k = *0.875 ; 18k = *0.75
// pure silver (999) = XAG/USD per troy ounce / 31.1035 * USD->EGP ; 925 = *(925/999) ; 800 = *(800/999)
import { writeFileSync, mkdirSync } from "node:fs";
const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${u} -> ${r.status}`); return r.json(); };
const gold = await get("https://api.gold-api.com/price/XAU");
const silver = await get("https://api.gold-api.com/price/XAG");
const fx = await get("https://open.er-api.com/v6/latest/USD");
const usdG = Number(gold.price), usdS = Number(silver.price), egp = Number(fx.rates && fx.rates.EGP);
if (!(usdG > 0) || !(usdS > 0) || !(egp > 0)) throw new Error("Bad market data " + JSON.stringify({ usdG, usdS, egp }));
const g24 = (usdG / 31.1035) * egp, s999 = (usdS / 31.1035) * egp, r2 = (n) => Math.round(n * 100) / 100;
const out = { updated: new Date().toISOString(), source: "gold-api.com XAU/XAG x open.er-api.com EGP",
  prices: { 24: r2(g24), 21: r2(g24 * 0.875), 18: r2(g24 * 0.75) },
  silver: { 999: r2(s999), 925: r2(s999 * 925 / 999), 800: r2(s999 * 800 / 999) } };
mkdirSync("data", { recursive: true });
writeFileSync("data/gold.json", JSON.stringify(out, null, 2) + "\n");
console.log(out);
