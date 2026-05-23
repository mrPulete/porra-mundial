export function rankingSummaryEmail(name: string, position: number, points: number) {
  return {
    subject: "Resumen de ranking",
    html: `<h2>Hola ${name}</h2><p>Actualmente estas en la posicion ${position} con ${points} puntos.</p>`,
  };
}
