import fs from "fs";
import path from "path";
import xlsx from "xlsx";

const xlsxPath = path.resolve("data/latvian_words_with_translations.xlsx");
const outPath  = path.resolve("data/words.json");

// Adjust these to your actual sheet/column names if different:
const SHEET_NAME = 0; // 0 = first sheet
// Expected columns (case-insensitive contains):
// lv | eng | ru | tag (tag optional)

function normalizeKey(k) {
  return String(k).trim().toLowerCase();
}

const wb = xlsx.readFile(xlsxPath);
const sheet = typeof SHEET_NAME === "number" ? wb.Sheets[wb.SheetNames[SHEET_NAME]] : wb.Sheets[SHEET_NAME];
if (!sheet) {
  throw new Error("Sheet not found. Check SHEET_NAME.");
}

const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

const data = rows.map((row) => {
  const mapped = {};
  for (const [k, v] of Object.entries(row)) {
    const nk = normalizeKey(k);
    if (nk.includes("lv"))  mapped.lv  = String(v).trim();
    if (nk.includes("eng") || nk.includes("en")) mapped.eng = String(v).trim();
    if (nk === "ru" || nk.includes("rus")) mapped.ru = String(v).trim();
    if (nk.includes("tag") || nk.includes("pos")) mapped.tag = String(v).trim();
  }
  return mapped;
}).filter(r => r.lv && (r.eng || r.ru));

fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8");
console.log(`Wrote ${data.length} items to ${outPath}`);


// End of file

