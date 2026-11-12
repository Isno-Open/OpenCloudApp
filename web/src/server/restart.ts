// Redemarrage du portail pour appliquer un changement lu au demarrage (base, plugins). Docker le relance
// (restart: unless-stopped) ; la page attend qu'il reponde de nouveau, puis se recharge.
export const restartSoon = (): void => { setTimeout(() => process.exit(0), 400); };
