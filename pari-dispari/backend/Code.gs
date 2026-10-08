/**
 * Backend dati - Pari o Dispari? V6
 * Google Apps Script Web App -> Google Sheet centrale.
 *
 * Questa versione apre direttamente il foglio dati tramite ID:
 * non usa DriveApp e non deve cercare file per nome.
 */
const SPREADSHEET_ID = "1rAbHoS56VEvOna4huxBcCvp7ASLJ7C5f75AXbo_D3Bw";
const SHEET_NAME = "EVENTI";
const EXPECTED_SOURCE = "numbersPRV-pari-dispari-v6";

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (body.source !== EXPECTED_SOURCE) {
      return json_({ok:false, error:"source_not_allowed"});
    }

    const events = Array.isArray(body.events) ? body.events : [];
    if (!events.length) return json_({ok:true, inserted:0});

    // TEST non viene mai archiviato.
    const clean = events.filter(ev =>
      String(ev.player || "").trim().toLowerCase() !== "test"
    );
    if (!clean.length) return json_({ok:true, inserted:0});

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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

function doGet() {
  return json_({
    ok:true,
    service:"Alice game telemetry",
    version:"v6",
    spreadsheetId:SPREADSHEET_ID
  });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
