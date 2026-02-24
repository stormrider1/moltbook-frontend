import { importPKCS8, importSPKI, type KeyLike } from 'jose';

let privateKey: KeyLike | null = null;
let publicKey: KeyLike | null = null;

export async function getPrivateKey(): Promise<KeyLike> {
  if (privateKey) return privateKey;
  const b64 = process.env.JWT_PRIVATE_KEY;
  if (!b64) throw new Error('JWT_PRIVATE_KEY env var is not set');
  const pem = Buffer.from(b64, 'base64').toString('utf8');
  privateKey = await importPKCS8(pem, 'RS256');
  return privateKey;
}

export async function getPublicKey(): Promise<KeyLike> {
  if (publicKey) return publicKey;
  const b64 = process.env.JWT_PUBLIC_KEY;
  if (!b64) throw new Error('JWT_PUBLIC_KEY env var is not set');
  const pem = Buffer.from(b64, 'base64').toString('utf8');
  publicKey = await importSPKI(pem, 'RS256');
  return publicKey;
}
