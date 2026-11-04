// Évite qu'un bouton reste bloqué sur « Envoi… » si le réseau ne répond pas.
export function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout", status: 0 } }), ms)
    ),
  ]);
}

export function sendError(error) {
  if (!error) return "";
  if (error.message === "timeout") {
    return "Le réseau ne répond pas. Vérifiez votre connexion, puis réessayez dans un instant.";
  }
  if (error.status === 429 || /rate|seconds|security purposes/i.test(error.message || "")) {
    return "Un code vient déjà de vous être envoyé. Regardez vos e-mails (et les spams), ou réessayez dans une minute.";
  }
  return "L'envoi de l'e-mail a échoué. Vérifiez l'adresse et réessayez.";
}
