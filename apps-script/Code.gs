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

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();

    const row = [
      new Date(),
      data.customerName || "",
      data.phone || "",
      data.city || "",
      data.address || "",
      data.notes || "",
      formatItems_(data.items),
      data.itemCount || 0,
      data.subtotal || 0,
      data.language || ""
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
    .map((i) => `${i.qty} x ${i.name} (${i.lineTotal})`)
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
