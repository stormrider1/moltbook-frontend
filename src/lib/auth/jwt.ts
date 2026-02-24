import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getPrivateKey, getPublicKey } from './keys';

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  role: 'agent' | 'user' | 'admin';
  permissions: string[];
}

export async function signAccessToken(payload: {
  sub: string;
  role: 'agent' | 'user' | 'admin';
  permissions: string[];
}): Promise<string> {
  const privateKey = await getPrivateKey();
  const issuer = process.env.JWT_ISSUER ?? 'moltbook-frontend';
  const audience = process.env.JWT_AUDIENCE ?? 'moltbook-api';

  return new SignJWT({ role: payload.role, permissions: payload.permissions })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('15m')
    .setIssuer(issuer)
    .setAudience(audience)
    .sign(privateKey);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const publicKey = await getPublicKey();
  const issuer = process.env.JWT_ISSUER ?? 'moltbook-frontend';
  const audience = process.env.JWT_AUDIENCE ?? 'moltbook-api';

  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ['RS256'],
    issuer,
    audience,
  });

  return payload as AccessTokenPayload;
}
