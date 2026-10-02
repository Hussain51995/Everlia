import { randomBytes } from "crypto";

export function createQrToken(): string {
  return randomBytes(24).toString("base64url");
}
