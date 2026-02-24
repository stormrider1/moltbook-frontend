import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getRequiredPermission } from '@/lib/auth/roles';

// Public API routes — no JWT required
const PUBLIC_API_ROUTES: { method: string; path: string }[] = [
  { method: 'GET', path: '/api/health' },
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/refresh' },
];

function isPublicApiRoute(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  return PUBLIC_API_ROUTES.some(
    (r) => r.path === pathname && r.method === request.method
  );
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

function forbidden(ip: string, pathname: string, method: string, userId: string, role: string, requiredPermission: string): NextResponse {
  console.error({ ip, path: pathname, method, userId, role, requiredPermission, timestamp: new Date().toISOString(), reason: 'Forbidden' });
  return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Non-API routes: only security headers
  if (!pathname.startsWith('/api/')) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Public API routes: pass through with security headers
  if (isPublicApiRoute(request)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // All other /api/* routes: require valid JWT
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  if (!token) {
    console.error({ ip, path: pathname, timestamp: new Date().toISOString(), reason: 'Missing Bearer token' });
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await verifyAccessToken(token);
    const userId = payload.sub!;
    const role = String(payload.role);
    const permissions: string[] = Array.isArray(payload.permissions) ? payload.permissions : [];

    // Permission check: verify the JWT's permissions cover this method + path
    const required = getRequiredPermission(request.method, pathname);
    if (!permissions.includes(required)) {
      return forbidden(ip, pathname, request.method, userId, role, required);
    }

    // Inject user identity headers for route handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userId);
    requestHeaders.set('x-user-role', role);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return addSecurityHeaders(response);
  } catch (e) {
    console.error({ ip, path: pathname, timestamp: new Date().toISOString(), reason: (e as Error).message });
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
