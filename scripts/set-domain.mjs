// Replaces the placeholder domain everywhere (canonical links, social previews, sitemap, robots).
//   node scripts/set-domain.mjs yourdomain.com
// Run it ONCE after you know your real domain. (No Node? Do Find & Replace of  YOURDOMAIN.com  in index.html,
// products.html, robots.txt and sitemap.xml with your domain.)
import { readFileSync, writeFileSync } from "node:fs";
const d = (process.argv[2] || "").replace(/^https?:\/\//, "").replace(/\/+$/, "").trim();
if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)) { console.error("Usage: node scripts/set-domain.mjs yourdomain.com"); process.exit(1); }
for (const f of ["index.html", "products.html", "robots.txt", "sitemap.xml"]) {
  const t = readFileSync(f, "utf8"); writeFileSync(f, t.replaceAll("YOURDOMAIN.com", d)); console.log("updated", f);
}
