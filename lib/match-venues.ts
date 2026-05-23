type VenueInfo = {
  stadium: string;
  city: string;
};

// Sedes oficiales FIFA 2026 por roundOrder (fase de grupos, jornadas 1-3)
// Horarios en UTC. En España (CEST = UTC+2) sumar 2 horas para mostrar hora local.
const VENUE_BY_ROUND_ORDER: Record<number, VenueInfo> = {
  // Jornada 1
  1:  { stadium: "Estadio Azteca",          city: "Ciudad de México" },
  2:  { stadium: "Estadio Akron",           city: "Guadalajara" },
  3:  { stadium: "BMO Field",               city: "Toronto" },
  4:  { stadium: "Levi's Stadium",          city: "San Francisco" },
  5:  { stadium: "MetLife Stadium",         city: "Nueva Jersey" },
  6:  { stadium: "Gillette Stadium",        city: "Boston" },
  7:  { stadium: "SoFi Stadium",            city: "Los Ángeles" },
  8:  { stadium: "BC Place",                city: "Vancouver" },
  9:  { stadium: "NRG Stadium",             city: "Houston" },
  10: { stadium: "Lincoln Financial Field", city: "Filadelfia" },
  11: { stadium: "AT&T Stadium",            city: "Dallas" },
  12: { stadium: "Estadio BBVA",            city: "Monterrey" },
  13: { stadium: "Lumen Field",             city: "Seattle" },
  14: { stadium: "SoFi Stadium",            city: "Los Ángeles" },
  15: { stadium: "Mercedes-Benz Stadium",   city: "Atlanta" },
  16: { stadium: "Hard Rock Stadium",       city: "Miami" },
  17: { stadium: "MetLife Stadium",         city: "Nueva Jersey" },
  18: { stadium: "Gillette Stadium",        city: "Boston" },
  19: { stadium: "Arrowhead Stadium",       city: "Kansas City" },
  20: { stadium: "Levi's Stadium",          city: "San Francisco" },
  21: { stadium: "NRG Stadium",             city: "Houston" },
  22: { stadium: "Estadio Azteca",          city: "Ciudad de México" },
  23: { stadium: "AT&T Stadium",            city: "Dallas" },
  24: { stadium: "BMO Field",               city: "Toronto" },
  // Jornada 2
  25: { stadium: "Mercedes-Benz Stadium",   city: "Atlanta" },
  26: { stadium: "Estadio Akron",           city: "Guadalajara" },
  27: { stadium: "SoFi Stadium",            city: "Los Ángeles" },
  28: { stadium: "BC Place",                city: "Vancouver" },
  29: { stadium: "Gillette Stadium",        city: "Boston" },
  30: { stadium: "Lincoln Financial Field", city: "Filadelfia" },
  31: { stadium: "Lumen Field",             city: "Seattle" },
  32: { stadium: "Levi's Stadium",          city: "San Francisco" },
  33: { stadium: "BMO Field",               city: "Toronto" },
  34: { stadium: "Arrowhead Stadium",       city: "Kansas City" },
  35: { stadium: "NRG Stadium",             city: "Houston" },
  36: { stadium: "Estadio BBVA",            city: "Monterrey" },
  37: { stadium: "SoFi Stadium",            city: "Los Ángeles" },
  38: { stadium: "BC Place",                city: "Vancouver" },
  39: { stadium: "Mercedes-Benz Stadium",   city: "Atlanta" },
  40: { stadium: "Hard Rock Stadium",       city: "Miami" },
  41: { stadium: "Lincoln Financial Field", city: "Filadelfia" },
  42: { stadium: "MetLife Stadium",         city: "Nueva Jersey" },
  43: { stadium: "AT&T Stadium",            city: "Dallas" },
  44: { stadium: "Levi's Stadium",          city: "San Francisco" },
  45: { stadium: "NRG Stadium",             city: "Houston" },
  46: { stadium: "Estadio Akron",           city: "Guadalajara" },
  47: { stadium: "Gillette Stadium",        city: "Boston" },
  48: { stadium: "BMO Field",               city: "Toronto" },
  // Jornada 3 (simultáneos por grupo)
  49: { stadium: "Estadio Azteca",          city: "Ciudad de México" },
  50: { stadium: "Estadio BBVA",            city: "Monterrey" },
  51: { stadium: "BC Place",                city: "Vancouver" },
  52: { stadium: "Lumen Field",             city: "Seattle" },
  53: { stadium: "Hard Rock Stadium",       city: "Miami" },
  54: { stadium: "Mercedes-Benz Stadium",   city: "Atlanta" },
  55: { stadium: "SoFi Stadium",            city: "Los Ángeles" },
  56: { stadium: "Levi's Stadium",          city: "San Francisco" },
  57: { stadium: "Lincoln Financial Field", city: "Filadelfia" },
  58: { stadium: "MetLife Stadium",         city: "Nueva Jersey" },
  59: { stadium: "AT&T Stadium",            city: "Dallas" },
  60: { stadium: "Arrowhead Stadium",       city: "Kansas City" },
  61: { stadium: "Lumen Field",             city: "Seattle" },
  62: { stadium: "BC Place",                city: "Vancouver" },
  63: { stadium: "NRG Stadium",             city: "Houston" },
  64: { stadium: "Estadio Akron",           city: "Guadalajara" },
  65: { stadium: "Gillette Stadium",        city: "Boston" },
  66: { stadium: "BMO Field",               city: "Toronto" },
  67: { stadium: "Arrowhead Stadium",       city: "Kansas City" },
  68: { stadium: "AT&T Stadium",            city: "Dallas" },
  69: { stadium: "Hard Rock Stadium",       city: "Miami" },
  70: { stadium: "Mercedes-Benz Stadium",   city: "Atlanta" },
  71: { stadium: "MetLife Stadium",         city: "Nueva Jersey" },
  72: { stadium: "Lincoln Financial Field", city: "Filadelfia" },
};

// Sedes para rondas eliminatorias (por excelCode / partido número FIFA)
const VENUE_BY_CODE: Record<string, VenueInfo> = {
  // 32avos de final
  73: { stadium: "SoFi Stadium",            city: "Los Ángeles" },
  74: { stadium: "Gillette Stadium",        city: "Boston" },
  75: { stadium: "Estadio BBVA",            city: "Monterrey" },
  76: { stadium: "NRG Stadium",             city: "Houston" },
  77: { stadium: "MetLife Stadium",         city: "Nueva Jersey" },
  78: { stadium: "AT&T Stadium",            city: "Dallas" },
  79: { stadium: "Estadio Azteca",          city: "Ciudad de México" },
  80: { stadium: "Mercedes-Benz Stadium",   city: "Atlanta" },
  81: { stadium: "Levi's Stadium",          city: "San Francisco" },
  82: { stadium: "Lumen Field",             city: "Seattle" },
  83: { stadium: "BMO Field",               city: "Toronto" },
  84: { stadium: "SoFi Stadium",            city: "Los Ángeles" },
  85: { stadium: "BC Place",                city: "Vancouver" },
  86: { stadium: "Hard Rock Stadium",       city: "Miami" },
  87: { stadium: "Arrowhead Stadium",       city: "Kansas City" },
  88: { stadium: "AT&T Stadium",            city: "Dallas" },
  // 16avos de final
  89: { stadium: "Lincoln Financial Field", city: "Filadelfia" },
  90: { stadium: "NRG Stadium",             city: "Houston" },
  91: { stadium: "MetLife Stadium",         city: "Nueva Jersey" },
  92: { stadium: "Estadio Azteca",          city: "Ciudad de México" },
  93: { stadium: "AT&T Stadium",            city: "Dallas" },
  94: { stadium: "Lumen Field",             city: "Seattle" },
  95: { stadium: "Mercedes-Benz Stadium",   city: "Atlanta" },
  96: { stadium: "BC Place",                city: "Vancouver" },
  // Cuartos de final
  97: { stadium: "Gillette Stadium",        city: "Boston" },
  98: { stadium: "SoFi Stadium",            city: "Los Ángeles" },
  99: { stadium: "Hard Rock Stadium",       city: "Miami" },
  100: { stadium: "Arrowhead Stadium",      city: "Kansas City" },
  // Semifinales
  101: { stadium: "AT&T Stadium",           city: "Dallas" },
  102: { stadium: "Mercedes-Benz Stadium",  city: "Atlanta" },
  // Tercer puesto
  103: { stadium: "Hard Rock Stadium",      city: "Miami" },
  // Final
  104: { stadium: "MetLife Stadium",        city: "Nueva Jersey" },
};

export function resolveMatchVenue(roundOrder: number, excelCode?: string | null) {
  if (VENUE_BY_ROUND_ORDER[roundOrder]) {
    return VENUE_BY_ROUND_ORDER[roundOrder];
  }

  // Para fases eliminatorias, el excelCode viene como "W73", "W81", etc.
  if (excelCode) {
    const num = parseInt(excelCode.replace(/^[A-Z]+/, ""), 10);
    if (!isNaN(num) && VENUE_BY_CODE[num]) {
      return VENUE_BY_CODE[num];
    }
  }

  return {
    stadium: "Sede por confirmar",
    city: "",
  } satisfies VenueInfo;
}
