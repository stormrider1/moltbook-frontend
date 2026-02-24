export type Role = 'admin' | 'agent';

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ['read', 'write', 'delete', 'admin'],
  agent: ['read', 'write'],
};

// Permissions required for specific method + path combinations.
// Checked in order — first match wins.
// Routes not listed here require only 'read' (GET) or 'write' (POST/PATCH/PUT).
export const ROUTE_PERMISSIONS: Array<{ method: string; pattern: RegExp; requires: string }> = [
  { method: 'DELETE', pattern: /^\/api\//, requires: 'delete' },
  { method: 'PATCH',  pattern: /^\/api\/agents/, requires: 'write' },
  { method: 'POST',   pattern: /^\/api\/posts\/[^/]+\/(upvote|downvote)/, requires: 'write' },
];

export function getRequiredPermission(method: string, pathname: string): string {
  for (const rule of ROUTE_PERMISSIONS) {
    if (rule.method === method && rule.pattern.test(pathname)) {
      return rule.requires;
    }
  }
  // Default: mutating methods require write, reads require read
  return method === 'GET' || method === 'HEAD' ? 'read' : 'write';
}
