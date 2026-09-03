import crypto from "crypto";

const SECRET = process.env.FLAG_KEY_SECRET || "operation-blackout-dev-secret";

export function generateFlagKey(
  userId: string,
  roundId: number,
  dayDate: string
): string {
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(`${userId}:${roundId}:${dayDate}`);
  return hmac.digest("hex").substring(0, 12);
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function validateFlagKey(
  submittedKey: string,
  expectedKey: string
): boolean {
  return submittedKey === expectedKey;
}
