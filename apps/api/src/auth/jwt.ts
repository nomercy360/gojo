import { SignJWT, jwtVerify } from "jose";
import { env } from "../env.ts";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = "gojo-api";
const AUDIENCE = "gojo-web";

export type JwtPayload = {
  sub: string;
  sid: string;
  role: "student" | "teacher" | "admin";
};

export async function signSession(payload: JwtPayload, ttlSeconds = 60 * 60 * 24 * 30) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .setSubject(payload.sub)
    .sign(secret);
}

export async function verifySession(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return payload as unknown as JwtPayload;
}
