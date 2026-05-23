import { prisma } from "./prisma";

export type TemplateFormat = "csv" | "tsv";

interface TemplateMatch {
  matchId: string;
  code: string | null;
  stage: string;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  stadium: string;
  homeScore: number | null;
  awayScore: number | null;
}

/**
 * Genera una plantilla CSV/TSV para cargar resultados o predicciones
 */
export async function generateResultsTemplate(
  options?: {
    leagueId?: string;
    format?: TemplateFormat;
    includeResults?: boolean;
  }
): Promise<{ content: string; filename: string }> {
  const format = options?.format || "csv";
  const includeResults = options?.includeResults !== false;
  const delimiter = format === "csv" ? "," : "\t";

  // Fetch all matches
  const matches = await prisma.match.findMany({
    include: {
      homeTeam: { select: { name: true, code: true } },
      awayTeam: { select: { name: true, code: true } },
    },
    orderBy: [
      { kickoffAt: "asc" },
      { roundOrder: "asc" },
    ],
  });

  const templateMatches: TemplateMatch[] = matches.map((match) => {
    const kickoff = new Date(match.kickoffAt);
    return {
      matchId: match.id,
      code: match.excelCode,
      stage: match.stage,
      group: match.group,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      date: kickoff.toLocaleDateString("es-ES"),
      time: kickoff.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      stadium: "Estadio",
      homeScore: includeResults ? match.homeScore : null,
      awayScore: includeResults ? match.awayScore : null,
    };
  });

  // Build CSV/TSV content
  const headers = includeResults
    ? [
        "Codigo",
        "Fase",
        "Grupo",
        "Equipo Local",
        "Equipo Visitante",
        "Fecha",
        "Hora",
        "Estadio",
        "Goles Local",
        "Goles Visitante",
      ]
    : [
        "Codigo",
        "Fase",
        "Grupo",
        "Equipo Local",
        "Equipo Visitante",
        "Fecha",
        "Hora",
        "Estadio",
      ];

  const rows: string[] = [headers.join(delimiter)];

  for (const match of templateMatches) {
    const values = [
      escapeField(match.code?.toString() || ""),
      escapeField(match.stage),
      escapeField(match.group || ""),
      escapeField(match.homeTeam),
      escapeField(match.awayTeam),
      escapeField(match.date),
      escapeField(match.time),
      escapeField(match.stadium),
    ];

    if (includeResults) {
      values.push(escapeField(match.homeScore?.toString() || ""));
      values.push(escapeField(match.awayScore?.toString() || ""));
    }

    rows.push(values.join(delimiter));
  }

  const content = rows.join("\n");
  const timestamp = new Date().toISOString().split("T")[0];
  const filename =
    format === "csv"
      ? `resultados-plantilla-${timestamp}.csv`
      : `resultados-plantilla-${timestamp}.tsv`;

  return { content, filename };
}

/**
 * Escapa campos CSV si contienen comillas, comas o saltos de línea
 */
function escapeField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Parsea una plantilla CSV/TSV cargada
 */
export function parseTemplate(content: string, format: TemplateFormat = "csv"): TemplateMatch[] {
  const delimiter = format === "csv" ? "," : "\t";
  const lines = content.trim().split("\n");

  if (lines.length < 2) {
    throw new Error("Archivo vacío o incompleto");
  }

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine, delimiter);

  // Find column indices
  const normalizeHeader = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const normalizedHeaders = headers.map(normalizeHeader);

  const findIndex = (name: string) => {
    const normalizedName = normalizeHeader(name);
    return normalizedHeaders.findIndex((h) => h.includes(normalizedName));
  };
  const findAnyIndex = (names: string[]) => {
    for (const name of names) {
      const idx = findIndex(name);
      if (idx >= 0) {
        return idx;
      }
    }
    return -1;
  };

  const codeIdx = findAnyIndex(["codigo", "código"]);
  const stageIdx = findIndex("fase");
  const groupIdx = findIndex("grupo");
  const homeTeamIdx = findIndex("equipo local");
  const awayTeamIdx = findIndex("equipo visitante");
  const dateIdx = findIndex("fecha");
  const timeIdx = findIndex("hora");
  const stadiumIdx = findIndex("estadio");
  const homeScoreIdx = findAnyIndex(["goles local", "prediccion local", "predicción local"]);
  const awayScoreIdx = findAnyIndex(["goles visitante", "prediccion visitante", "predicción visitante"]);

  const results: TemplateMatch[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line, delimiter);
    const homeScoreValue = homeScoreIdx >= 0 ? values[homeScoreIdx]?.trim() : null;
    const awayScoreValue = awayScoreIdx >= 0 ? values[awayScoreIdx]?.trim() : null;

    results.push({
      matchId: "", // Will be resolved in the API
      code: codeIdx >= 0 ? values[codeIdx]?.trim() || null : null,
      stage: stageIdx >= 0 ? values[stageIdx]?.trim() || "" : "",
      group: groupIdx >= 0 ? values[groupIdx]?.trim() || null : null,
      homeTeam: homeTeamIdx >= 0 ? values[homeTeamIdx]?.trim() || "" : "",
      awayTeam: awayTeamIdx >= 0 ? values[awayTeamIdx]?.trim() || "" : "",
      date: dateIdx >= 0 ? values[dateIdx]?.trim() || "" : "",
      time: timeIdx >= 0 ? values[timeIdx]?.trim() || "" : "",
      stadium: stadiumIdx >= 0 ? values[stadiumIdx]?.trim() || "" : "",
      homeScore:
        homeScoreValue && !isNaN(Number(homeScoreValue))
          ? Number(homeScoreValue)
          : null,
      awayScore:
        awayScoreValue && !isNaN(Number(awayScoreValue))
          ? Number(awayScoreValue)
          : null,
    });
  }

  return results;
}

/**
 * Parsea una línea CSV respetando comillas
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}
