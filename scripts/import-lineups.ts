/**
 * Script to import probable lineups from Excel file and save as JSON.
 * Usage: npx tsx scripts/import-lineups.ts
 */
import * as XLSX from "xlsx";
import { writeFileSync } from "fs";
import { resolve } from "path";

const TEAM_NAME_TO_CODE: Record<string, string> = {
  "México": "MEXICO",
  "Mexico": "MEXICO",
  "Sudáfrica": "SUDAFRICA",
  "South Africa": "SUDAFRICA",
  "Corea del Sur": "COREA_DEL_SUR",
  "South Korea": "COREA_DEL_SUR",
  "Chequia": "REPUBLICA_CHECA",
  "República Checa": "REPUBLICA_CHECA",
  "Czech Republic": "REPUBLICA_CHECA",
  "Canadá": "CANADA",
  "Canada": "CANADA",
  "Bosnia y Herzegovina": "BOSNIA_Y_HERZEGOVINA",
  "Bosnia": "BOSNIA_Y_HERZEGOVINA",
  "Estados Unidos": "ESTADOS_UNIDOS",
  "United States": "ESTADOS_UNIDOS",
  "Paraguay": "PARAGUAY",
  "Qatar": "CATAR",
  "Catar": "CATAR",
  "Suiza": "SUIZA",
  "Switzerland": "SUIZA",
  "Brasil": "BRASIL",
  "Brazil": "BRASIL",
  "Marruecos": "MARRUECOS",
  "Morocco": "MARRUECOS",
  "Argentina": "ARGENTINA",
  "Francia": "FRANCIA",
  "France": "FRANCIA",
  "España": "ESPANA",
  "Spain": "ESPANA",
  "Inglaterra": "INGLATERRA",
  "England": "INGLATERRA",
  "Alemania": "ALEMANIA",
  "Germany": "ALEMANIA",
  "Portugal": "PORTUGAL",
  "Países Bajos": "PAISES_BAJOS",
  "Netherlands": "PAISES_BAJOS",
  "Bélgica": "BELGICA",
  "Belgium": "BELGICA",
  "Croacia": "CROACIA",
  "Croatia": "CROACIA",
  "Uruguay": "URUGUAY",
  "Colombia": "COLOMBIA",
  "Japón": "JAPON",
  "Japan": "JAPON",
  "Australia": "AUSTRALIA",
  "Arabia Saudita": "ARABIA_SAUDITA",
  "Saudi Arabia": "ARABIA_SAUDITA",
  "Irán": "IRAN",
  "Iran": "IRAN",
  "Senegal": "SENEGAL",
  "Ghana": "GHANA",
  "Camerún": "CAMEROON",
  "Cameroon": "CAMEROON",
  "Nigeria": "NIGERIA",
  "Túnez": "TUNEZ",
  "Tunisia": "TUNEZ",
  "Egipto": "EGIPTO",
  "Egypt": "EGIPTO",
  "Ecuador": "ECUADOR",
  "Chile": "CHILE",
  "Perú": "PERU",
  "Peru": "PERU",
  "Bolivia": "BOLIVIA",
  "Venezuela": "VENEZUELA",
  "Costa Rica": "COSTARICA",
  "Honduras": "HONDURAS",
  "Panamá": "PANAMA",
  "Panama": "PANAMA",
  "Jamaica": "JAMAICA",
  "Serbia": "SERBIA",
  "Dinamarca": "DINAMARCA",
  "Denmark": "DINAMARCA",
  "Suecia": "SUECIA",
  "Sweden": "SUECIA",
  "Noruega": "NORUEGA",
  "Norway": "NORUEGA",
  "Polonia": "POLONIA",
  "Poland": "POLONIA",
  "Ucrania": "UCRANIA",
  "Ukraine": "UCRANIA",
  "Escocia": "ESCOCIA",
  "Scotland": "ESCOCIA",
  "Gales": "GALES",
  "Wales": "GALES",
  "Austria": "AUSTRIA",
  "Turquía": "TURQUIA",
  "Turkey": "TURQUIA",
  "Grecia": "GRECIA",
  "Greece": "GRECIA",
  "Rumanía": "RUMANIA",
  "Romania": "RUMANIA",
  "Hungría": "HUNGRIA",
  "Hungary": "HUNGRIA",
  "Eslovaquia": "ESLOVAQUIA",
  "Slovakia": "ESLOVAQUIA",
  "Eslovenia": "ESLOVENIA",
  "Slovenia": "ESLOVENIA",
  "Albania": "ALBANIA",
  "Nueva Zelanda": "NUEVA_ZELANDA",
  "New Zealand": "NUEVA_ZELANDA",
  "Indonesia": "INDONESIA",
};

function parseLineup(lineupStr: string): { formation: string; players: string[] } {
  // Lineup format: "GK; DEF1, DEF2, ...; MID1, MID2, ...; FW1, FW2"
  // Split by semicolons for position groups
  const groups = lineupStr.split(";").map((g) => g.trim());
  const players = groups.flatMap((g) => g.split(",").map((p) => p.trim()));

  // Determine formation from group sizes (skip GK)
  const positionCounts = groups.slice(1).map((g) => g.split(",").length);
  const formation = positionCounts.join("-");

  return { formation, players };
}

const excelPath = resolve(__dirname, "../data/world_cup_2026_probable_lineups.xlsx");
const wb = XLSX.readFile(excelPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json<[string, string]>(ws, { header: 1 });

const lineups: Record<string, { formation: string; players: string[] }> = {};

for (const row of rows.slice(1)) { // Skip header
  const [teamName, lineupStr] = row;
  if (!teamName || !lineupStr) continue;

  const code = TEAM_NAME_TO_CODE[teamName];
  if (!code) {
    console.warn(`Unknown team: "${teamName}"`);
    continue;
  }

  const parsed = parseLineup(lineupStr);
  lineups[code] = parsed;
  console.log(`${code}: ${parsed.formation} (${parsed.players.length} players)`);
}

const outputPath = resolve(__dirname, "../data/probable-lineups.json");
writeFileSync(outputPath, JSON.stringify(lineups, null, 2));
console.log(`\nSaved ${Object.keys(lineups).length} lineups to data/probable-lineups.json`);
