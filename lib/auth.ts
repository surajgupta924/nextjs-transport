import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "fleetflow_session";
const SESSION_DAYS = 14;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, expected] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function digest(token: string) { return createHash("sha256").update(token).digest("hex"); }

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, tokenHash: digest(token), expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
  jar.set("fleetflow_session_hint", "1", { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: digest(token) } });
  jar.delete(COOKIE);
  jar.delete("fleetflow_session_hint");
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  // Keep this on the hot path for every API request: never fetch logoData (base64)
  // or unrelated tenant fields while checking a session.
  const session = await prisma.session.findUnique({
    where: { tokenHash: digest(token) },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true, tenantId: true, name: true, email: true, role: true,
          phone: true, firstLogin: true, isActive: true,
          tenant: { select: { id: true, name: true, isActive: true, logoUrl: true, accentColor: true } },
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date() || !session.user.isActive) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}
