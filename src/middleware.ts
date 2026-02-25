import { NextResponse } from 'next/server';

// Future usage: path arrays for server-side auth cookie support
// const protectedPaths = ['/dashboard', '/groups', '/expenses', '/friends', '/settle', '/activity', '/settings'];
// const authPaths = ['/login', '/register', '/forgot-password', '/reset-password'];

export function middleware() {
  // Check if user has auth tokens (stored as cookie or we check localStorage client-side)
  // Since localStorage isn't available in middleware, we use a lightweight check
  // The real auth check happens in the (app)/layout.tsx client component
  // This middleware handles basic redirects only

  // Let all requests through - auth is handled client-side by AuthProvider
  // This middleware is here for future server-side auth cookie support
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
