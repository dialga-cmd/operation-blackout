import crypto from "crypto";

function getSecret(): string {
  const secret = process.env.FLAG_KEY_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "FLAG_KEY_SECRET is not configured. Set a strong random secret (>= 16 chars) in the environment."
    );
  }
  return secret;
}

export function generateFlagKey(
  userId: string,
  roundId: number,
  dayDate: string
): string {
  const hmac = crypto.createHmac("sha256", getSecret());
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
