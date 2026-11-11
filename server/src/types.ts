// Modèle de données, partagé par les implémentations de store (SQLite, Mongo).
export type Account = { id: string; deviceCap: number; passHash: string | null };
export type Device = { deviceId: string; accountId: string; name: string; firmware: string };
export type Pairing = { code: string; accountId: string; deviceId: string; name: string };
