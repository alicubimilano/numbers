/**
 * Backend dati - Pari o Dispari? V6
 * Google Apps Script Web App -> Google Sheet centrale.
 */
const DATA_FILE_NAME = "ALICE - DATI GIOCHI MATEMATICA";
const SHEET_NAME = "EVENTI";
const EXPECTED_SOURCE = "numbersPRV-pari-dispari-v6";

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (body.source !== EXPECTED_SOURCE) return json_({ok:false, error:"source_not_allowed"});

    const events = Array.isArray(body.events) ? body.events : [];
    if (!events.length) return json_({ok:true, inserted:0});

    // Protezione ridondante: TEST non viene mai archiviato.
    const clean = events.filter(ev =>
      String(ev.player || "").trim().toLowerCase() !== "test"
    );
    if (!clean.length) return json_({ok:true, inserted:0});

    const ss = openDataSpreadsheet_();
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(SHEET_NAME);
      sh.appendRow([
        "id","ts","at","sessionId","player","avatar","mode","activeLevel","stage",
        "type","sessionMs","levelMs","payload_json"
      ]);
    }

    // Deduplica per id: rende sicuro ritentare la coda dal browser.
    const lastRow = sh.getLastRow();
    const existing = new Set(
      lastRow > 1
        ? sh.getRange(2,1,lastRow-1,1).getDisplayValues().flat().filter(Boolean)
        : []
    );

    const fresh = clean.filter(ev => ev.id && !existing.has(String(ev.id)));
    if (!fresh.length) return json_({ok:true, inserted:0});

    const rows = fresh.map(ev => [
      ev.id || "", ev.ts || "", ev.at || "", ev.sessionId || "",
      ev.player || "", ev.avatar || "", ev.mode || "", ev.activeLevel || "",
      ev.stage || "", ev.type || "", ev.sessionMs || 0, ev.levelMs || 0,
      JSON.stringify(ev)
    ]);

    sh.getRange(sh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
    return json_({ok:true, inserted:rows.length});
  } catch (err) {
    return json_({ok:false,error:String(err)});
  }
}

function openDataSpreadsheet_() {
  const files = DriveApp.getFilesByName(DATA_FILE_NAME);
  if (!files.hasNext()) throw new Error("Data spreadsheet not found: " + DATA_FILE_NAME);
  return SpreadsheetApp.openById(files.next().getId());
}

function doGet() {
  return json_({ok:true, service:"Alice game telemetry", version:"v6"});
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}