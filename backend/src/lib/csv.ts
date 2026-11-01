// Bygger en CSV-fil som Excel (svenska inställningar) och Google Kalkylark kan öppna.
//   - Semikolon (;) som avskiljare: svenska Excel använder det, inte kommatecken.
//   - BOM först i filen, så att å, ä och ö visas rätt i Excel.
//   - Radbrytning \r\n.

const SEPARATOR = ';'
const BOM = '﻿'

// Skydd mot "CSV-injektion": text som börjar med = + - @ (eller tab/radbrytning)
// kan tolkas som en formel när filen öppnas i Excel. Ett namn som "=HYPERLINK(...)"
// skulle då köras. Vi lägger ett ' framför, så blir det vanlig text.
const FORMULA_START = /^[=+\-@\t\r]/

export function escapeCell(value: string | number): string {
  let text = String(value)
  if (FORMULA_START.test(text)) text = `'${text}`
  // Fält med avskiljare, citattecken eller radbrytning måste stå inom citattecken
  if (/[;"\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(SEPARATOR))
  return BOM + lines.join('\r\n') + '\r\n'
}
