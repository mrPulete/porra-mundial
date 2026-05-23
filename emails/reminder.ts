export function reminderEmail(name: string, matchLabel: string) {
  return {
    subject: "Recordatorio de partido",
    html: `<h2>${name}, no olvides tu prediccion</h2><p>Se acerca ${matchLabel}. Actualiza tu porra antes del cierre.</p>`,
  };
}
