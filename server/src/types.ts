// Modèle de données, partagé par les implémentations de store (SQLite, Mongo).
// admin = opérateur du portail (voit Paramètres + gestion des utilisateurs). Il reste un compte comme les
// autres : il possède et pilote aussi ses propres appareils.
export type Account = { id: string; deviceCap: number; passHash: string | null; admin: boolean };
export type Device = { deviceId: string; accountId: string; name: string; firmware: string };
export type Pairing = { code: string; accountId: string; deviceId: string; name: string };

// État d'une demande d'autorisation d'appareil (RFC 8628). Énuméré : le code s'y réfère par son nom,
// jamais par une chaîne écrite à la main (une faute de frappe serait silencieuse).
export const DEVICE_AUTH_STATE = { pending: "pending", approved: "approved", consumed: "consumed" } as const;
export type DeviceAuthState = (typeof DEVICE_AUTH_STATE)[keyof typeof DEVICE_AUTH_STATE];

// Demande d'autorisation « façon Netflix » (device authorization grant) : la box affiche un code,
// l'utilisateur l'approuve depuis son compte, puis la box récupère son certificat en interrogeant.
// deviceCode = secret détenu par la box (sert au polling) ; userCode = code court montré/scanné.
export type DeviceAuth = {
  deviceCode: string; userCode: string; deviceId: string; firmware: string;
  state: DeviceAuthState; accountId: string | null; name: string | null; expiresAt: number;
};
