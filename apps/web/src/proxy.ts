import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const hasToken = req.cookies.has('token');
  const { pathname } = req.nextUrl;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isProtectedRoute = pathname.startsWith('/home') || pathname.startsWith('/onboarding');

  if (!hasToken && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (hasToken && isAuthRoute) {
    return NextResponse.redirect(new URL('/home', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};