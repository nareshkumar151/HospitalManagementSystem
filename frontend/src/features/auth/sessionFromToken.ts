import { tokenStorage } from '../../api/client'
import { decodeJwtPayload } from '../../utils/jwt'
import type { RoleName } from '../../types'
import type { AuthUser } from './authTypes'

/**
 * A SuperAdmin's JWT carries two "role" claims (SuperAdmin + a secondary Administrator claim so every
 * Administrator-gated API endpoint already works for them - see JwtTokenService). Decoding a JWT with two
 * claims of the same type yields an array for that key instead of a single string, so this always takes
 * the first value - the same one ASP.NET Core's ClaimsPrincipal.FindFirstValue resolves server-side (see
 * CurrentUserService.Role) - keeping client and server agreed on "what role is this person".
 */
function firstRoleClaim(value: unknown): RoleName {
  return (Array.isArray(value) ? value[0] : value) as RoleName
}

/**
 * Synchronously reconstructs the logged-in user from the stored JWT, if any. Used both to seed Redux's
 * initial state directly (so the very first render already knows who's logged in - a hard reload on a
 * deep route like /app/manage/hospitals must not flash "logged out", which would bounce ProtectedRoute to
 * /login and then, once the async restore caught up, straight to /app/dashboard instead of back to the
 * page the user actually reloaded) and by the restoreSession thunk for the same effect after logout/login
 * transitions that don't remount the app.
 */
export function getUserFromStoredToken(): AuthUser | null {
  const token = tokenStorage.getAccessToken()
  if (!token) return null

  const payload = decodeJwtPayload<Record<string, unknown>>(token)
  if (!payload) {
    tokenStorage.clear()
    return null
  }

  return {
    userId: Number(payload.sub),
    username: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] as string,
    email: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] as string,
    role: firstRoleClaim(payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']),
    branchId: payload.branchId ? Number(payload.branchId) : null,
    linkedProfileId: payload.linkedProfileId ? Number(payload.linkedProfileId) : null,
  }
}
