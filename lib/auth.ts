import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_development_secret_do_not_use_in_production'
);

export async function signToken(payload: Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // 30 day logins
    .sign(secretKey);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const session = cookies().get('aijourney_session')?.value;
  if (!session) return null;
  return await verifyToken(session);
}
