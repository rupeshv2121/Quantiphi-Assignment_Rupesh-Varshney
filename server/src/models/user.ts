import { randomBytes, scryptSync, createHmac, timingSafeEqual } from "node:crypto";
import { Schema, model, type InferSchemaType } from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "nexa-ai-secure-secret-key-quantiphi-2026";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
    },
    passwordHash: { type: String, required: true },
    salt: { type: String, required: true },
  },
  { timestamps: true },
);

export type UserRecord = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actualHash = scryptSync(password, salt, 64).toString("hex");
  return actualHash === expectedHash;
}

export interface AuthPayload {
  userId: string;
  username: string;
  exp: number;
}

export function createAuthToken(userId: string, username: string): string {
  const payload: AuthPayload = {
    userId,
    username,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", JWT_SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    const expectedSignature = createHmac("sha256", JWT_SECRET).update(payloadB64).digest("base64url");
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as AuthPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
