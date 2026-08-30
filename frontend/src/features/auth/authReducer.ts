import { AUTH_LOGIN_FAILURE, AUTH_LOGIN_START, AUTH_LOGIN_SUCCESS, AUTH_LOGOUT, AUTH_RESTORE_SESSION, type AuthAction, type AuthState } from './authTypes'
import { getUserFromStoredToken } from './sessionFromToken'

// Seeded synchronously (not via an effect after mount) so the very first render already knows who's
// logged in - otherwise a hard reload on a deep route (e.g. /app/manage/hospitals) briefly looks logged
// out, ProtectedRoute bounces to /login, and by the time the async restore catches up the user lands on
// /app/dashboard instead of back on the page they reloaded.
const initialUser = getUserFromStoredToken()

const initialState: AuthState = {
  user: initialUser,
  status: initialUser ? 'succeeded' : 'idle',
  error: null,
}

export function authReducer(state = initialState, action: AuthAction): AuthState {
  switch (action.type) {
    case AUTH_LOGIN_START:
      return { ...state, status: 'loading', error: null }
    case AUTH_LOGIN_SUCCESS:
      return { ...state, status: 'succeeded', user: action.payload, error: null }
    case AUTH_LOGIN_FAILURE:
      return { ...state, status: 'failed', error: action.payload }
    case AUTH_RESTORE_SESSION:
      return { ...state, user: action.payload, status: action.payload ? 'succeeded' : 'idle' }
    case AUTH_LOGOUT:
      // NOT `{ ...initialState }` - that object was captured once at module load from whatever token was
      // in localStorage *then*, so spreading it here would silently restore the very session being logged
      // out of (tokenStorage.clear() empties localStorage, but this stale object still had a `user`).
      return { user: null, status: 'idle', error: null }
    default:
      return state
  }
}
