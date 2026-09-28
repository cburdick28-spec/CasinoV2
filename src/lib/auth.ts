import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { get } from "./db";
import type { UserRow } from "./types";

const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me-in-env";
const key = new TextEncoder().encode(SECRET);
const COOKIE_NAME = "casino_session";
const SESSION_DAYS = 30;

export { hashPassword, verifyPassword } from "./password";

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<number | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    return typeof payload.uid === "number" ? payload.uid : null;
  } catch {
    return null;
  }
}

export async function getUserById(id: number): Promise<UserRow | undefined> {
  return get<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
}

export async function getUserByUsername(username: string): Promise<UserRow | undefined> {
  return get<UserRow>("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", [username]);
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const uid = await getSessionUserId();
  if (!uid) return null;
  return (await getUserById(uid)) ?? null;
}
