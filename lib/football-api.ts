/**
 * Football API service layer.
 * Fetches team data from Football-Data.org and ELO ratings.
 * Results are cached in the database via TeamFootballData model.
 */

import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlayerInfo = {
  name: string;
  position: string;
  club: string;
  number?: number;
  injured?: boolean;
  suspended?: boolean;
  starter?: boolean;
};

export type MatchResult = {
  opponent: string;
  opponentFlag?: string;
  date: string;
  competition: string;
  goalsFor: number;
  goalsAgainst: number;
  result: "W" | "D" | "L";
};

export type TournamentOdds = {
  passGroup: number | null;
  quarterFinal: number | null;
  semiFinal: number | null;
  final: number | null;
  champion: number | null;
};

export type TeamFootballInfo = {
  fifaRanking: number | null;
  eloRating: number | null;
  eloRank: number | null;
  coach: string | null;
  squad: PlayerInfo[];
  probableXI: string[];
  recentMatches: MatchResult[];
  stats: {
    goalsScored: number;
    goalsConceded: number;
    cleanSheets: number;
    avgGoalsPerMatch: number;
    matchesPlayed: number;
  };
  odds: TournamentOdds;
  worldCupHistory: {
    appearances: number;
    bestFinish: string;
    titles: number;
    lastResult: string | null;
  };
  formation: string | null;
  fetchedAt: string;
};

// ─── Team code mapping to Football-Data.org team IDs ─────────────────────────

const TEAM_CODE_TO_FD_ID: Record<string, number> = {
  MEXICO: 769, ESTADOS_UNIDOS: 771, CANADA: 828, BRASIL: 764,
  ARGENTINA: 762, ALEMANIA: 759, ESPANA: 760, FRANCIA: 773,
  INGLATERRA: 770, PORTUGAL: 765, PAISES_BAJOS: 8601, BELGICA: 805,
  CROACIA: 799, URUGUAY: 758, COLOMBIA: 818,
  JAPON: 766, COREA_DEL_SUR: 772, AUSTRALIA: 779, ARABIA_SAUDITA: 801,
  IRAN: 840, CATAR: 8030, MARRUECOS: 815, SENEGAL: 804,
  GHANA: 763, ECUADOR: 791,
  PARAGUAY: 761, PANAMA: 1836,
  SUIZA: 788, NORUEGA: 8872,
  SUECIA: 792, TURQUIA: 803,
  REPUBLICA_CHECA: 798, AUSTRIA: 816,
  ESCOCIA: 8873, EGIPTO: 825, TUNEZ: 802,
  BOSNIA_Y_HERZEGOVINA: 1060, SUDAFRICA: 774,
  NUEVA_ZELANDA: 783, ARGELIA: 778, CABO_VERDE: 1930,
  CURAZAO: 9460, HAITI: 836, IRAK: 8062, JORDANIA: 8049,
  COSTA_DE_MARFIL: 1935, RD_CONGO: 1934, UZBEKISTAN: 8070,
};

// ─── FIFA ranking data (static snapshot - can be updated via fetch) ──────────

const FIFA_RANKINGS: Record<string, number> = {
  ARGENTINA: 1, FRANCIA: 2, ESPANA: 3, INGLATERRA: 4, BRASIL: 5,
  PORTUGAL: 6, PAISES_BAJOS: 7, BELGICA: 8, ALEMANIA: 10,
  URUGUAY: 11, COLOMBIA: 12, CROACIA: 13, MARRUECOS: 14, JAPON: 15,
  ESTADOS_UNIDOS: 16, MEXICO: 17, SENEGAL: 18, ECUADOR: 19, TURQUIA: 20,
  AUSTRALIA: 21, CANADA: 22, SUIZA: 24, AUSTRIA: 25,
  COREA_DEL_SUR: 26, IRAN: 27, SUECIA: 32,
  PANAMA: 41, PARAGUAY: 42, ESCOCIA: 43, NORUEGA: 45,
  REPUBLICA_CHECA: 47, CATAR: 50,
  ARABIA_SAUDITA: 51, TUNEZ: 39, EGIPTO: 40, GHANA: 37,
  SUDAFRICA: 60, BOSNIA_Y_HERZEGOVINA: 54, NUEVA_ZELANDA: 58,
};

// ─── ELO ratings (static snapshot - approximate) ─────────────────────────────

const ELO_RATINGS: Record<string, { rating: number; rank: number }> = {
  ARGENTINA: { rating: 2143, rank: 1 }, FRANCIA: { rating: 2082, rank: 2 },
  ESPANA: { rating: 2059, rank: 3 }, INGLATERRA: { rating: 2019, rank: 4 },
  BRASIL: { rating: 2005, rank: 5 }, ALEMANIA: { rating: 1988, rank: 6 },
  PORTUGAL: { rating: 1975, rank: 7 }, PAISES_BAJOS: { rating: 1960, rank: 8 },
  BELGICA: { rating: 1940, rank: 9 },
  CROACIA: { rating: 1920, rank: 11 }, URUGUAY: { rating: 1905, rank: 12 },
  COLOMBIA: { rating: 1895, rank: 13 }, MARRUECOS: { rating: 1880, rank: 14 },
  JAPON: { rating: 1850, rank: 15 }, ESTADOS_UNIDOS: { rating: 1835, rank: 16 },
  MEXICO: { rating: 1825, rank: 17 }, SENEGAL: { rating: 1810, rank: 18 },
  SUIZA: { rating: 1790, rank: 20 },
  COREA_DEL_SUR: { rating: 1780, rank: 22 }, AUSTRALIA: { rating: 1770, rank: 23 },
  CANADA: { rating: 1760, rank: 24 }, TURQUIA: { rating: 1755, rank: 25 },
  AUSTRIA: { rating: 1750, rank: 26 }, IRAN: { rating: 1745, rank: 27 },
  ECUADOR: { rating: 1740, rank: 28 },
  SUECIA: { rating: 1720, rank: 32 },
  TUNEZ: { rating: 1670, rank: 38 }, EGIPTO: { rating: 1665, rank: 39 },
  GHANA: { rating: 1660, rank: 40 },
  CATAR: { rating: 1640, rank: 42 }, PANAMA: { rating: 1635, rank: 43 },
  ARABIA_SAUDITA: { rating: 1630, rank: 44 }, NORUEGA: { rating: 1625, rank: 45 },
  ESCOCIA: { rating: 1620, rank: 46 },
  PARAGUAY: { rating: 1600, rank: 48 }, REPUBLICA_CHECA: { rating: 1595, rank: 49 },
  BOSNIA_Y_HERZEGOVINA: { rating: 1535, rank: 55 },
  NUEVA_ZELANDA: { rating: 1490, rank: 59 },
  SUDAFRICA: { rating: 1500, rank: 58 },
};

// ─── World Cup history ───────────────────────────────────────────────────────

// Load probable lineups from JSON file (generated from Excel import)
let PROBABLE_LINEUPS: Record<string, { formation: string; players: string[] }> = {};
try {
  const lineupsPath = resolve(process.cwd(), "data/probable-lineups.json");
  PROBABLE_LINEUPS = JSON.parse(readFileSync(lineupsPath, "utf-8"));
} catch {
  // File may not exist yet
}

// ─── Recent match results (curated pre-tournament data) ──────────────────────

const RECENT_MATCHES: Record<string, MatchResult[]> = {
  MEXICO: [
    { opponent: "Bolivia", date: "2025-11-19", competition: "Amistoso", goalsFor: 3, goalsAgainst: 0, result: "W" },
    { opponent: "Honduras", date: "2025-11-15", competition: "Amistoso", goalsFor: 2, goalsAgainst: 1, result: "W" },
    { opponent: "Estados Unidos", date: "2025-10-15", competition: "Liga de Naciones", goalsFor: 0, goalsAgainst: 2, result: "L" },
    { opponent: "Canadá", date: "2025-10-11", competition: "Liga de Naciones", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "Guatemala", date: "2025-09-10", competition: "Amistoso", goalsFor: 4, goalsAgainst: 0, result: "W" },
  ],
  BRASIL: [
    { opponent: "Argentina", date: "2025-11-19", competition: "Clasificatorias", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "Uruguay", date: "2025-11-14", competition: "Clasificatorias", goalsFor: 2, goalsAgainst: 1, result: "W" },
    { opponent: "Venezuela", date: "2025-10-15", competition: "Clasificatorias", goalsFor: 3, goalsAgainst: 1, result: "W" },
    { opponent: "Perú", date: "2025-10-10", competition: "Clasificatorias", goalsFor: 4, goalsAgainst: 0, result: "W" },
    { opponent: "Chile", date: "2025-09-10", competition: "Clasificatorias", goalsFor: 2, goalsAgainst: 1, result: "W" },
  ],
  ARGENTINA: [
    { opponent: "Brasil", date: "2025-11-19", competition: "Clasificatorias", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "Paraguay", date: "2025-11-14", competition: "Clasificatorias", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Bolivia", date: "2025-10-15", competition: "Clasificatorias", goalsFor: 3, goalsAgainst: 0, result: "W" },
    { opponent: "Venezuela", date: "2025-10-10", competition: "Clasificatorias", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Colombia", date: "2025-09-10", competition: "Clasificatorias", goalsFor: 2, goalsAgainst: 1, result: "W" },
  ],
  FRANCIA: [
    { opponent: "Alemania", date: "2025-11-19", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Italia", date: "2025-11-15", competition: "UEFA Nations League", goalsFor: 3, goalsAgainst: 1, result: "W" },
    { opponent: "Bélgica", date: "2025-10-14", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Israel", date: "2025-10-10", competition: "UEFA Nations League", goalsFor: 4, goalsAgainst: 1, result: "W" },
    { opponent: "Austria", date: "2025-09-08", competition: "Amistoso", goalsFor: 1, goalsAgainst: 1, result: "D" },
  ],
  ESPANA: [
    { opponent: "Países Bajos", date: "2025-11-19", competition: "UEFA Nations League", goalsFor: 3, goalsAgainst: 2, result: "W" },
    { opponent: "Dinamarca", date: "2025-11-15", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 1, result: "W" },
    { opponent: "Serbia", date: "2025-10-14", competition: "UEFA Nations League", goalsFor: 3, goalsAgainst: 0, result: "W" },
    { opponent: "Suiza", date: "2025-10-10", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "Francia", date: "2025-09-05", competition: "Amistoso", goalsFor: 2, goalsAgainst: 2, result: "D" },
  ],
  INGLATERRA: [
    { opponent: "Grecia", date: "2025-11-19", competition: "UEFA Nations League", goalsFor: 3, goalsAgainst: 0, result: "W" },
    { opponent: "Irlanda", date: "2025-11-15", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Finlandia", date: "2025-10-14", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Grecia", date: "2025-10-10", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 2, result: "L" },
    { opponent: "Irlanda", date: "2025-09-07", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 0, result: "W" },
  ],
  ALEMANIA: [
    { opponent: "Francia", date: "2025-11-19", competition: "UEFA Nations League", goalsFor: 0, goalsAgainst: 1, result: "L" },
    { opponent: "Países Bajos", date: "2025-11-15", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Bosnia", date: "2025-10-14", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 1, result: "W" },
    { opponent: "Hungría", date: "2025-10-10", competition: "UEFA Nations League", goalsFor: 5, goalsAgainst: 0, result: "W" },
    { opponent: "Países Bajos", date: "2025-09-10", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 2, result: "D" },
  ],
  PORTUGAL: [
    { opponent: "Croacia", date: "2025-11-19", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "Polonia", date: "2025-11-15", competition: "UEFA Nations League", goalsFor: 3, goalsAgainst: 1, result: "W" },
    { opponent: "Escocia", date: "2025-10-14", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 1, result: "W" },
    { opponent: "Polonia", date: "2025-10-10", competition: "UEFA Nations League", goalsFor: 3, goalsAgainst: 1, result: "W" },
    { opponent: "Croacia", date: "2025-09-05", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 1, result: "W" },
  ],
  ESTADOS_UNIDOS: [
    { opponent: "México", date: "2025-10-15", competition: "Liga de Naciones", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Canadá", date: "2025-10-11", competition: "Liga de Naciones", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Panamá", date: "2025-09-10", competition: "Liga de Naciones", goalsFor: 3, goalsAgainst: 0, result: "W" },
    { opponent: "Nueva Zelanda", date: "2025-06-14", competition: "Amistoso", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Colombia", date: "2025-06-10", competition: "Amistoso", goalsFor: 1, goalsAgainst: 1, result: "D" },
  ],
  CANADA: [
    { opponent: "México", date: "2025-10-11", competition: "Liga de Naciones", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "Estados Unidos", date: "2025-10-11", competition: "Liga de Naciones", goalsFor: 0, goalsAgainst: 1, result: "L" },
    { opponent: "Costa Rica", date: "2025-09-10", competition: "Liga de Naciones", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Trinidad", date: "2025-06-14", competition: "Amistoso", goalsFor: 3, goalsAgainst: 0, result: "W" },
    { opponent: "Jamaica", date: "2025-06-10", competition: "Amistoso", goalsFor: 1, goalsAgainst: 0, result: "W" },
  ],
  MARRUECOS: [
    { opponent: "RD Congo", date: "2025-11-19", competition: "Clasificatorias CAF", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Tanzania", date: "2025-11-15", competition: "Clasificatorias CAF", goalsFor: 3, goalsAgainst: 0, result: "W" },
    { opponent: "Gabón", date: "2025-10-14", competition: "Clasificatorias CAF", goalsFor: 4, goalsAgainst: 1, result: "W" },
    { opponent: "Lesoto", date: "2025-10-10", competition: "Clasificatorias CAF", goalsFor: 5, goalsAgainst: 0, result: "W" },
    { opponent: "Zambia", date: "2025-09-10", competition: "Clasificatorias CAF", goalsFor: 2, goalsAgainst: 1, result: "W" },
  ],
  COREA_DEL_SUR: [
    { opponent: "Irak", date: "2025-11-19", competition: "Clasificatorias AFC", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Palestina", date: "2025-11-14", competition: "Clasificatorias AFC", goalsFor: 3, goalsAgainst: 0, result: "W" },
    { opponent: "Jordania", date: "2025-10-15", competition: "Clasificatorias AFC", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Omán", date: "2025-10-10", competition: "Clasificatorias AFC", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Kuwait", date: "2025-09-10", competition: "Clasificatorias AFC", goalsFor: 3, goalsAgainst: 1, result: "W" },
  ],
  SUIZA: [
    { opponent: "Serbia", date: "2025-11-19", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "España", date: "2025-10-10", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "Dinamarca", date: "2025-10-14", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Serbia", date: "2025-09-07", competition: "UEFA Nations League", goalsFor: 0, goalsAgainst: 1, result: "L" },
    { opponent: "Dinamarca", date: "2025-09-05", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 2, result: "D" },
  ],
  CATAR: [
    { opponent: "EAU", date: "2025-11-19", competition: "Clasificatorias AFC", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Bahréin", date: "2025-11-14", competition: "Clasificatorias AFC", goalsFor: 2, goalsAgainst: 1, result: "W" },
    { opponent: "India", date: "2025-10-15", competition: "Clasificatorias AFC", goalsFor: 3, goalsAgainst: 0, result: "W" },
    { opponent: "Kuwait", date: "2025-10-10", competition: "Clasificatorias AFC", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "Afganistán", date: "2025-09-10", competition: "Clasificatorias AFC", goalsFor: 4, goalsAgainst: 0, result: "W" },
  ],
  REPUBLICA_CHECA: [
    { opponent: "Georgia", date: "2025-11-19", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 1, result: "W" },
    { opponent: "Albania", date: "2025-11-15", competition: "UEFA Nations League", goalsFor: 0, goalsAgainst: 1, result: "L" },
    { opponent: "Ucrania", date: "2025-10-14", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 2, result: "L" },
    { opponent: "Georgia", date: "2025-10-10", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "Albania", date: "2025-09-07", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 0, result: "W" },
  ],
  PARAGUAY: [
    { opponent: "Ecuador", date: "2025-11-19", competition: "Clasificatorias", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Argentina", date: "2025-11-14", competition: "Clasificatorias", goalsFor: 0, goalsAgainst: 2, result: "L" },
    { opponent: "Bolivia", date: "2025-10-15", competition: "Clasificatorias", goalsFor: 2, goalsAgainst: 1, result: "W" },
    { opponent: "Venezuela", date: "2025-10-10", competition: "Clasificatorias", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "Brasil", date: "2025-09-10", competition: "Clasificatorias", goalsFor: 0, goalsAgainst: 1, result: "L" },
  ],
  PAISES_BAJOS: [
    { opponent: "España", date: "2025-11-19", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 3, result: "L" },
    { opponent: "Alemania", date: "2025-11-15", competition: "UEFA Nations League", goalsFor: 0, goalsAgainst: 1, result: "L" },
    { opponent: "Hungría", date: "2025-10-14", competition: "UEFA Nations League", goalsFor: 4, goalsAgainst: 0, result: "W" },
    { opponent: "Alemania", date: "2025-09-10", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 2, result: "D" },
    { opponent: "Bosnia", date: "2025-09-07", competition: "UEFA Nations League", goalsFor: 5, goalsAgainst: 2, result: "W" },
  ],
  CROACIA: [
    { opponent: "Portugal", date: "2025-11-19", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "Escocia", date: "2025-11-15", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 1, result: "W" },
    { opponent: "Polonia", date: "2025-10-14", competition: "UEFA Nations League", goalsFor: 3, goalsAgainst: 1, result: "W" },
    { opponent: "Escocia", date: "2025-10-10", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Portugal", date: "2025-09-05", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 2, result: "L" },
  ],
  COLOMBIA: [
    { opponent: "Chile", date: "2025-11-19", competition: "Clasificatorias", goalsFor: 3, goalsAgainst: 2, result: "W" },
    { opponent: "Uruguay", date: "2025-11-14", competition: "Clasificatorias", goalsFor: 2, goalsAgainst: 2, result: "D" },
    { opponent: "Bolivia", date: "2025-10-15", competition: "Clasificatorias", goalsFor: 3, goalsAgainst: 0, result: "W" },
    { opponent: "Argentina", date: "2025-09-10", competition: "Clasificatorias", goalsFor: 1, goalsAgainst: 2, result: "L" },
    { opponent: "Perú", date: "2025-09-05", competition: "Clasificatorias", goalsFor: 1, goalsAgainst: 0, result: "W" },
  ],
  JAPON: [
    { opponent: "Australia", date: "2025-11-19", competition: "Clasificatorias AFC", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Indonesia", date: "2025-11-14", competition: "Clasificatorias AFC", goalsFor: 4, goalsAgainst: 0, result: "W" },
    { opponent: "Arabia Saudita", date: "2025-10-15", competition: "Clasificatorias AFC", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Australia", date: "2025-10-10", competition: "Clasificatorias AFC", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "Bahréin", date: "2025-09-10", competition: "Clasificatorias AFC", goalsFor: 5, goalsAgainst: 0, result: "W" },
  ],
  URUGUAY: [
    { opponent: "Brasil", date: "2025-11-14", competition: "Clasificatorias", goalsFor: 1, goalsAgainst: 2, result: "L" },
    { opponent: "Colombia", date: "2025-11-14", competition: "Clasificatorias", goalsFor: 2, goalsAgainst: 2, result: "D" },
    { opponent: "Ecuador", date: "2025-10-15", competition: "Clasificatorias", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Perú", date: "2025-10-10", competition: "Clasificatorias", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Paraguay", date: "2025-09-10", competition: "Clasificatorias", goalsFor: 3, goalsAgainst: 1, result: "W" },
  ],
  BELGICA: [
    { opponent: "Italia", date: "2025-11-19", competition: "UEFA Nations League", goalsFor: 0, goalsAgainst: 1, result: "L" },
    { opponent: "Francia", date: "2025-10-14", competition: "UEFA Nations League", goalsFor: 0, goalsAgainst: 2, result: "L" },
    { opponent: "Israel", date: "2025-10-10", competition: "UEFA Nations League", goalsFor: 3, goalsAgainst: 1, result: "W" },
    { opponent: "Italia", date: "2025-10-10", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 2, result: "D" },
    { opponent: "Francia", date: "2025-09-09", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 2, result: "L" },
  ],
  SENEGAL: [
    { opponent: "Costa de Marfil", date: "2025-11-19", competition: "Clasificatorias CAF", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "Togo", date: "2025-11-14", competition: "Clasificatorias CAF", goalsFor: 3, goalsAgainst: 0, result: "W" },
    { opponent: "Congo", date: "2025-10-14", competition: "Clasificatorias CAF", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Mauritania", date: "2025-10-10", competition: "Clasificatorias CAF", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Burundi", date: "2025-09-10", competition: "Clasificatorias CAF", goalsFor: 4, goalsAgainst: 1, result: "W" },
  ],
  AUSTRALIA: [
    { opponent: "Japón", date: "2025-11-19", competition: "Clasificatorias AFC", goalsFor: 0, goalsAgainst: 2, result: "L" },
    { opponent: "Arabia Saudita", date: "2025-11-14", competition: "Clasificatorias AFC", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Bahréin", date: "2025-10-15", competition: "Clasificatorias AFC", goalsFor: 2, goalsAgainst: 1, result: "W" },
    { opponent: "Japón", date: "2025-10-10", competition: "Clasificatorias AFC", goalsFor: 1, goalsAgainst: 1, result: "D" },
    { opponent: "China", date: "2025-09-10", competition: "Clasificatorias AFC", goalsFor: 3, goalsAgainst: 1, result: "W" },
  ],
  SUDAFRICA: [
    { opponent: "Nigeria", date: "2025-11-19", competition: "Clasificatorias CAF", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Benín", date: "2025-11-14", competition: "Clasificatorias CAF", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Zimbabwe", date: "2025-10-14", competition: "Clasificatorias CAF", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Ruanda", date: "2025-10-10", competition: "Clasificatorias CAF", goalsFor: 2, goalsAgainst: 1, result: "W" },
    { opponent: "Nigeria", date: "2025-09-10", competition: "Clasificatorias CAF", goalsFor: 1, goalsAgainst: 1, result: "D" },
  ],
  BOSNIA_Y_HERZEGOVINA: [
    { opponent: "Alemania", date: "2025-10-14", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 2, result: "L" },
    { opponent: "Países Bajos", date: "2025-09-07", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 5, result: "L" },
    { opponent: "Hungría", date: "2025-11-19", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 0, result: "W" },
    { opponent: "Hungría", date: "2025-11-15", competition: "UEFA Nations League", goalsFor: 2, goalsAgainst: 0, result: "W" },
    { opponent: "Alemania", date: "2025-09-10", competition: "UEFA Nations League", goalsFor: 1, goalsAgainst: 2, result: "L" },
  ],
};

const WORLD_CUP_HISTORY: Record<string, { appearances: number; bestFinish: string; titles: number; lastResult: string }> = {
  BRASIL: { appearances: 22, bestFinish: "Campeón", titles: 5, lastResult: "Cuartos (2022)" },
  ALEMANIA: { appearances: 20, bestFinish: "Campeón", titles: 4, lastResult: "Fase de Grupos (2022)" },
  ARGENTINA: { appearances: 18, bestFinish: "Campeón", titles: 3, lastResult: "Campeón (2022)" },
  FRANCIA: { appearances: 16, bestFinish: "Campeón", titles: 2, lastResult: "Final (2022)" },
  URUGUAY: { appearances: 14, bestFinish: "Campeón", titles: 2, lastResult: "Fase de Grupos (2022)" },
  INGLATERRA: { appearances: 16, bestFinish: "Campeón", titles: 1, lastResult: "Cuartos (2022)" },
  ESPANA: { appearances: 16, bestFinish: "Campeón", titles: 1, lastResult: "Octavos (2022)" },
  MEXICO: { appearances: 17, bestFinish: "Cuartos", titles: 0, lastResult: "Fase de Grupos (2022)" },
  PAISES_BAJOS: { appearances: 11, bestFinish: "Final", titles: 0, lastResult: "Cuartos (2022)" },
  CROACIA: { appearances: 6, bestFinish: "Final", titles: 0, lastResult: "3er puesto (2022)" },
  PORTUGAL: { appearances: 8, bestFinish: "3er puesto", titles: 0, lastResult: "Cuartos (2022)" },
  BELGICA: { appearances: 14, bestFinish: "3er puesto", titles: 0, lastResult: "Fase de Grupos (2022)" },
  JAPON: { appearances: 7, bestFinish: "Octavos", titles: 0, lastResult: "Octavos (2022)" },
  COREA_DEL_SUR: { appearances: 11, bestFinish: "4to puesto", titles: 0, lastResult: "Fase de Grupos (2022)" },
  ESTADOS_UNIDOS: { appearances: 11, bestFinish: "3er puesto", titles: 0, lastResult: "Octavos (2022)" },
  MARRUECOS: { appearances: 6, bestFinish: "4to puesto", titles: 0, lastResult: "4to puesto (2022)" },
  SENEGAL: { appearances: 3, bestFinish: "Cuartos", titles: 0, lastResult: "Octavos (2022)" },
  COLOMBIA: { appearances: 6, bestFinish: "Cuartos", titles: 0, lastResult: "No clasificada (2022)" },
  AUSTRALIA: { appearances: 6, bestFinish: "Octavos", titles: 0, lastResult: "Octavos (2022)" },
  SUIZA: { appearances: 12, bestFinish: "Cuartos", titles: 0, lastResult: "Octavos (2022)" },
  CANADA: { appearances: 2, bestFinish: "Fase de Grupos", titles: 0, lastResult: "Fase de Grupos (2022)" },
  ECUADOR: { appearances: 4, bestFinish: "Octavos", titles: 0, lastResult: "Fase de Grupos (2022)" },
  IRAN: { appearances: 6, bestFinish: "Fase de Grupos", titles: 0, lastResult: "Fase de Grupos (2022)" },
  ARABIA_SAUDITA: { appearances: 7, bestFinish: "Octavos", titles: 0, lastResult: "Fase de Grupos (2022)" },
  CATAR: { appearances: 1, bestFinish: "Fase de Grupos", titles: 0, lastResult: "Fase de Grupos (2022)" },
  GHANA: { appearances: 4, bestFinish: "Cuartos", titles: 0, lastResult: "Fase de Grupos (2022)" },
  TUNEZ: { appearances: 6, bestFinish: "Fase de Grupos", titles: 0, lastResult: "Fase de Grupos (2022)" },
  PARAGUAY: { appearances: 8, bestFinish: "Cuartos", titles: 0, lastResult: "No clasificada (2022)" },
  AUSTRIA: { appearances: 7, bestFinish: "3er puesto", titles: 0, lastResult: "No clasificada (2022)" },
  TURQUIA: { appearances: 2, bestFinish: "3er puesto", titles: 0, lastResult: "No clasificada (2022)" },
  PANAMA: { appearances: 1, bestFinish: "Fase de Grupos", titles: 0, lastResult: "No clasificada (2022)" },
  NORUEGA: { appearances: 3, bestFinish: "Fase de Grupos", titles: 0, lastResult: "No clasificada (2022)" },
  ESCOCIA: { appearances: 8, bestFinish: "Fase de Grupos", titles: 0, lastResult: "No clasificada (2022)" },
  REPUBLICA_CHECA: { appearances: 9, bestFinish: "Final", titles: 0, lastResult: "No clasificada (2022)" },
  SUECIA: { appearances: 12, bestFinish: "Final", titles: 0, lastResult: "No clasificada (2022)" },
  EGIPTO: { appearances: 3, bestFinish: "Fase de Grupos", titles: 0, lastResult: "Fase de Grupos (2018)" },
  BOSNIA_Y_HERZEGOVINA: { appearances: 1, bestFinish: "Fase de Grupos", titles: 0, lastResult: "Fase de Grupos (2014)" },
  SUDAFRICA: { appearances: 3, bestFinish: "Fase de Grupos", titles: 0, lastResult: "Fase de Grupos (2010)" },
  NUEVA_ZELANDA: { appearances: 2, bestFinish: "Fase de Grupos", titles: 0, lastResult: "No clasificada (2022)" },
};

// ─── Tournament odds based on ELO model ─────────────────────────────────────

function computeOddsFromElo(teamCode: string): TournamentOdds {
  const elo = ELO_RATINGS[teamCode];
  if (!elo) return { passGroup: null, quarterFinal: null, semiFinal: null, final: null, champion: null };

  // Simple ELO-based probability model
  const rating = elo.rating;
  const maxRating = 2143; // Argentina
  const minRating = 1450; // Indonesia

  // Normalize to 0-1 scale
  const strength = (rating - minRating) / (maxRating - minRating);

  // Progressive probabilities based on strength
  const passGroup = Math.min(98, Math.round(40 + strength * 58));
  const quarterFinal = Math.min(85, Math.round(10 + strength * 70));
  const semiFinal = Math.min(65, Math.round(3 + strength * 55));
  const final = Math.min(45, Math.round(1 + strength * 38));
  const champion = Math.min(28, Math.round(strength * 22));

  return { passGroup, quarterFinal, semiFinal, final, champion };
}

// ─── Football-Data.org API fetcher ───────────────────────────────────────────

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || "";
const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";

async function fetchFromFootballData(endpoint: string): Promise<unknown | null> {
  if (!FOOTBALL_DATA_API_KEY) return null;

  try {
    const res = await fetch(`${FOOTBALL_DATA_BASE}${endpoint}`, {
      headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY },
      next: { revalidate: 3600 }, // cache for 1 hour
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchSquadFromApi(teamCode: string): Promise<{ squad: PlayerInfo[]; coach: string | null }> {
  const fdId = TEAM_CODE_TO_FD_ID[teamCode];
  if (!fdId) return { squad: [], coach: null };

  const data = await fetchFromFootballData(`/teams/${fdId}`) as {
    squad?: Array<{ name: string; position: string; currentTeam?: { name: string }; shirtNumber?: number }>;
    coach?: { name: string };
  } | null;

  if (!data) return { squad: [], coach: null };

  const squad: PlayerInfo[] = (data.squad || []).map((p) => ({
    name: p.name,
    position: mapPosition(p.position),
    club: p.currentTeam?.name || "—",
    number: p.shirtNumber,
  }));

  return { squad, coach: data.coach?.name || null };
}

async function fetchRecentMatchesFromApi(teamCode: string): Promise<MatchResult[]> {
  const fdId = TEAM_CODE_TO_FD_ID[teamCode];
  if (!fdId) return [];

  const data = await fetchFromFootballData(`/teams/${fdId}/matches?status=FINISHED&limit=10`) as {
    matches?: Array<{
      utcDate: string;
      competition: { name: string };
      homeTeam: { name: string; id: number };
      awayTeam: { name: string; id: number };
      score: { fullTime: { home: number; away: number } };
    }>;
  } | null;

  if (!data?.matches) return [];

  return data.matches.map((m) => {
    const isHome = m.homeTeam.id === fdId;
    const goalsFor = isHome ? m.score.fullTime.home : m.score.fullTime.away;
    const goalsAgainst = isHome ? m.score.fullTime.away : m.score.fullTime.home;
    const opponent = isHome ? m.awayTeam.name : m.homeTeam.name;
    const result = goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D";

    return {
      opponent,
      date: m.utcDate,
      competition: m.competition.name,
      goalsFor,
      goalsAgainst,
      result: result as "W" | "D" | "L",
    };
  });
}

function mapPosition(pos: string): string {
  switch (pos) {
    case "Goalkeeper": return "GK";
    case "Defence":
    case "Left-Back":
    case "Right-Back":
    case "Centre-Back":
      return "DEF";
    case "Midfield":
    case "Central Midfield":
    case "Attacking Midfield":
    case "Defensive Midfield":
    case "Left Midfield":
    case "Right Midfield":
      return "MID";
    case "Offence":
    case "Left Winger":
    case "Right Winger":
    case "Centre-Forward":
      return "FW";
    default: return pos || "MID";
  }
}

function buildFallbackXIFromSquad(squad: PlayerInfo[]): { probableXI: string[]; formation: string | null } {
  if (squad.length === 0) {
    return { probableXI: [], formation: null };
  }

  const buckets: Record<"GK" | "DEF" | "MID" | "FW", PlayerInfo[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FW: [],
  };

  for (const player of squad) {
    if (player.position === "GK" || player.position === "DEF" || player.position === "MID" || player.position === "FW") {
      buckets[player.position].push(player);
    }
  }

  const pick = (
    count: number,
    candidates: PlayerInfo[],
    taken: Set<string>
  ) => {
    const selected: string[] = [];
    for (const player of candidates) {
      if (selected.length >= count) {
        break;
      }
      if (!taken.has(player.name)) {
        selected.push(player.name);
        taken.add(player.name);
      }
    }
    return selected;
  };

  const taken = new Set<string>();
  const gk = pick(1, buckets.GK.length > 0 ? buckets.GK : squad, taken);
  const def = pick(4, buckets.DEF, taken);
  const mid = pick(3, buckets.MID, taken);
  const fw = pick(3, buckets.FW, taken);

  const probableXI = [...gk, ...def, ...mid, ...fw];
  if (probableXI.length < 11) {
    for (const player of squad) {
      if (probableXI.length >= 11) {
        break;
      }
      if (!taken.has(player.name)) {
        probableXI.push(player.name);
        taken.add(player.name);
      }
    }
  }

  const formation = `${def.length || 4}-${mid.length || 3}-${fw.length || 3}`;
  return { probableXI, formation };
}

function enrichTeamFootballData(teamCode: string, data: TeamFootballInfo): TeamFootballInfo {
  const lineup = PROBABLE_LINEUPS[teamCode];

  let probableXI = Array.isArray(data.probableXI) && data.probableXI.length > 0 ? data.probableXI : lineup?.players ?? [];
  let formation = data.formation ?? lineup?.formation ?? null;

  if (probableXI.length === 0) {
    const fallback = buildFallbackXIFromSquad(data.squad ?? []);
    probableXI = fallback.probableXI;
    if (!formation) {
      formation = fallback.formation;
    }
  }

  const squad = (data.squad ?? []).map((player) => ({ ...player, starter: false }));
  if (squad.length > 0 && probableXI.length > 0) {
    for (const player of squad) {
      player.starter = probableXI.some(
        (xi) =>
          player.name.toLowerCase().includes(xi.toLowerCase().split(" ").pop()!) ||
          xi.toLowerCase().includes(player.name.toLowerCase().split(" ").pop()!)
      );
    }
  }

  return {
    ...data,
    squad,
    probableXI,
    formation,
  };
}

// ─── Main fetch function ─────────────────────────────────────────────────────

export async function fetchTeamFootballData(teamCode: string): Promise<TeamFootballInfo> {
  // Try API call for squad
  const squadResult = await fetchSquadFromApi(teamCode);

  // Get recent matches: first try API, then fall back to curated data
  let recentMatches = await fetchRecentMatchesFromApi(teamCode);
  if (recentMatches.length === 0) {
    recentMatches = RECENT_MATCHES[teamCode] || [];
  }

  // Compute stats from recent matches
  const matchesPlayed = recentMatches.length;
  const goalsScored = recentMatches.reduce((s, m) => s + m.goalsFor, 0);
  const goalsConceded = recentMatches.reduce((s, m) => s + m.goalsAgainst, 0);
  const cleanSheets = recentMatches.filter((m) => m.goalsAgainst === 0).length;

  const odds = computeOddsFromElo(teamCode);
  const history = WORLD_CUP_HISTORY[teamCode] || { appearances: 0, bestFinish: "N/A", titles: 0, lastResult: null };

  return enrichTeamFootballData(teamCode, {
    fifaRanking: FIFA_RANKINGS[teamCode] || null,
    eloRating: ELO_RATINGS[teamCode]?.rating || null,
    eloRank: ELO_RATINGS[teamCode]?.rank || null,
    coach: squadResult.coach,
    squad: squadResult.squad,
    probableXI: [],
    recentMatches,
    stats: {
      goalsScored,
      goalsConceded,
      cleanSheets,
      avgGoalsPerMatch: matchesPlayed > 0 ? Math.round((goalsScored / matchesPlayed) * 100) / 100 : 0,
      matchesPlayed,
    },
    odds,
    worldCupHistory: history,
    formation: null,
    fetchedAt: new Date().toISOString(),
  });
}

// ─── Cached fetch with DB storage ───────────────────────────────────────────

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getTeamFootballData(teamCode: string): Promise<TeamFootballInfo> {
  // Check cache
  const cached = await prisma.teamFootballData.findUnique({
    where: { teamCode },
  });

  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_DURATION_MS) {
    return enrichTeamFootballData(teamCode, cached.data as unknown as TeamFootballInfo);
  }

  // Fetch fresh data
  const data = await fetchTeamFootballData(teamCode);

  // Upsert cache
  await prisma.teamFootballData.upsert({
    where: { teamCode },
    update: { data: data as unknown as Prisma.InputJsonValue, fetchedAt: new Date() },
    create: { teamCode, data: data as unknown as Prisma.InputJsonValue },
  });

  return data;
}

// ─── Force refresh (admin action) ───────────────────────────────────────────

export async function refreshTeamFootballData(teamCode: string): Promise<TeamFootballInfo> {
  const data = await fetchTeamFootballData(teamCode);

  await prisma.teamFootballData.upsert({
    where: { teamCode },
    update: { data: data as unknown as Prisma.InputJsonValue, fetchedAt: new Date() },
    create: { teamCode, data: data as unknown as Prisma.InputJsonValue },
  });

  return data;
}
