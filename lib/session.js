const encoder = new TextEncoder();

async function getKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function toBase64Url(buf) {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function criarSessionToken(secret, diasValidade = 30) {
  const expira = Date.now() + diasValidade * 24 * 60 * 60 * 1000;
  const payload = String(expira);
  const key = await getKey(secret);
  const assinatura = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return `${payload}.${toBase64Url(assinatura)}`;
}

export async function validarSessionToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.') || !secret) return false;
  const [payload, assinaturaB64] = token.split('.');
  const expira = Number(payload);
  if (!expira || Number.isNaN(expira) || Date.now() > expira) return false;
  try {
    const key = await getKey(secret);
    const assinatura = fromBase64Url(assinaturaB64);
    return await crypto.subtle.verify('HMAC', key, assinatura, encoder.encode(payload));
  } catch {
    return false;
  }
}
