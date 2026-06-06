import { cache } from "react";

export type Player = {
  id: number;
  name: string;
  position: string;
  dateOfBirth: string;
  nationality: string;
  shirtNumber: number | null;
  role: string;
};

export type TeamSquad = {
  teamCode: string;
  teamName: string;
  players: Player[];
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
const playerCache = new Map<string, { data: Player[]; timestamp: number }>();

export async function getTeamSquad(teamCode: string): Promise<Player[]> {
  const cached = playerCache.get(teamCode);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;
    if (!apiKey) {
      return [];
    }

    const response = await fetch(
      `https://api.football-data.org/v4/teams/${teamCode.toLowerCase()}`,
      {
        headers: { "X-Auth-Token": apiKey },
        next: { revalidate: 86400 },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as { squad?: Player[] };
    const players = data.squad ?? [];

    playerCache.set(teamCode, {
      data: players,
      timestamp: Date.now(),
    });

    return players;
  } catch {
    return [];
  }
}

export async function getAllPlayersFlat(): Promise<Player[]> {
  const teamCodes = [
    "URU", "ARG", "PAR", "CHI", "BRA", "COL", "ECU", "PER", "BOL", "VEN",
    "GUY", "SUR", "MEX", "USA", "CAN", "CRC", "PAN", "HON", "SLV", "NIC",
    "GTM", "BLZ", "JAM", "TRI", "BAH", "DOM", "CUB", "HAI",
    "ENG", "FRA", "GER", "ESP", "ITA", "NED", "BEL", "POR", "SRB", "CRO",
    "UKR", "POL", "CZE", "SVK", "HUN", "ROU", "BUL", "GRE", "TUR",
    "MOR", "TUN", "EGY", "CMR", "GHA", "NGA", "SEN", "CIV",
    "JPN", "KOR", "CHN", "AUS", "IRN", "IRQ", "SAU", "UAE", "UZB",
  ];

  const allPlayers: Player[] = [];
  const seen = new Set<string>();

  for (const code of teamCodes) {
    try {
      const players = await getTeamSquad(code);
      for (const player of players) {
        const key = `${player.name}-${code}`;
        if (!seen.has(key)) {
          seen.add(key);
          allPlayers.push(player);
        }
      }
    } catch {
      continue;
    }
  }

  return allPlayers;
}

export function filterPlayersByPosition(players: Player[], positions: string[]): Player[] {
  return players.filter((p) =>
    positions.some((pos) => p.position?.toLowerCase().includes(pos.toLowerCase()))
  );
}

export function getGoalkeepers(players: Player[]): Player[] {
  return filterPlayersByPosition(players, ["goalkeeper", "gk"]);
}

export function getOutfieldPlayers(players: Player[]): Player[] {
  return players.filter((p) =>
    !p.position?.toLowerCase().includes("goalkeeper") &&
    !p.position?.toLowerCase().includes("gk")
  );
}
