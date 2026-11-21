/**
 * Gamal Abo Hel'al — Order intake script.
 *
 * SETUP (see the project README for the full walkthrough):
 * 1. Create a Google Sheet, e.g. "Orders".
 * 2. In the sheet: Extensions -> Apps Script.
 * 3. Delete any starter code and paste this whole file in.
 * 4. Click Deploy -> New deployment -> type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Authorize when prompted, then copy the Web App URL.
 * 6. Paste that URL into js/config.js as googleSheetWebAppUrl.
 */

const SHEET_NAME = "Orders"; // change if your sheet tab has a different name

// Anyone on the internet can call this URL, so every value is cleaned and abuse is limited.
const MAX_BODY = 12000;          // characters
const MAX_ORDERS_PER_HOUR = 5;   // per phone number

// A cell starting with = + - @ would be run as a spreadsheet formula. Neutralise it, and cap the length.
function safe_(v, max) {
  let t = String(v == null ? "" : v).replace(/[\u0000-\u001F]/g, " ").trim().slice(0, max || 300);
  if (/^[=+\-@]/.test(t)) t = "'" + t;
  return t;
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || "";
    if (raw.length > MAX_BODY) throw new Error("too large");
    const data = JSON.parse(raw);

    const phone = safe_(data.phone, 30);
    const cache = CacheService.getScriptCache();
    const key = "ord_" + phone.replace(/\D/g, "");
    const n = Number(cache.get(key) || 0);
    if (n >= MAX_ORDERS_PER_HOUR) throw new Error("rate limited");
    cache.put(key, String(n + 1), 3600);

    const sheet = getSheet_();

    const row = [
      new Date(),
      safe_(data.customerName, 120),
      phone,
      safe_(data.city, 80),
      safe_(data.address, 400),
      safe_(data.notes, 600),
      safe_(formatItems_(data.items), 1500),
      Number(data.itemCount) || 0,
      Number(data.subtotal) || 0,
      safe_(data.language, 5)
    ];
    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function formatItems_(items) {
  if (!items || !items.length) return "";
  return items
    .slice(0, 30)
    .map((i) => `${Number(i.qty) || 0} x ${String(i.name || "").slice(0, 80)} (${Number(i.lineTotal) || 0})`)
    .join(" | ");
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp", "Customer name", "Phone", "City", "Address",
      "Notes", "Items", "Item count", "Subtotal", "Language"
    ]);
  }
  return sheet;
}
