import { NextResponse } from 'next/server';
import { validarSessionToken } from './lib/session';

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  const publico =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico';

  if (publico) return NextResponse.next();

  const token = req.cookies.get('sdr_session')?.value;
  const valido = await validarSessionToken(token, process.env.SESSION_SECRET || '');

  if (!valido) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
