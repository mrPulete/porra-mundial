export function welcomeEmail(name: string) {
  return {
    subject: "Bienvenido a Porra Mundial",
    html: `<h1>Hola ${name}</h1><p>Tu cuenta ya esta lista. Empieza tus predicciones ahora.</p>`,
  };
}
