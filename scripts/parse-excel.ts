/**
 * Parses RV-Reindeer-Games.xlsx and prints extracted JSON for all year sheets.
 * Run: npx tsx scripts/parse-excel.ts
 *
 * Output is written to stdout as JSON — pipe to inspect or redirect to files.
 */
import * as XLSX from 'xlsx';
import * as path from 'path';

const EXCEL_PATH = path.join(process.cwd(), 'RV-Reindeer-Games.xlsx');

const wb = XLSX.readFile(EXCEL_PATH);

function parseSheet(sheetName: string): void {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.error(`Sheet "${sheetName}" not found`);
    return;
  }

  console.log(`\n=== Sheet: ${sheetName} ===`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];
  rows.forEach((row, i) => {
    console.log(`Row ${i}:`, JSON.stringify(row));
  });
}

const targetSheets = ['2023', '2024', '2025'];
for (const s of targetSheets) {
  parseSheet(s);
}
