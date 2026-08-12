import { NextResponse } from 'next/server';
import { criarSessionToken } from '../../../lib/session';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Requisição inválida' }, { status: 400 });
  }

  const senha = body && body.senha;
  const senhaCorreta = process.env.APP_PASSWORD;

  if (!senhaCorreta) {
    return NextResponse.json({ ok: false, erro: 'APP_PASSWORD não configurada no servidor' }, { status: 500 });
  }
  if (!senha || senha !== senhaCorreta) {
    return NextResponse.json({ ok: false, erro: 'Senha incorreta' }, { status: 401 });
  }

  const token = await criarSessionToken(process.env.SESSION_SECRET || '');
  const res = NextResponse.json({ ok: true });
  res.cookies.set('sdr_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
