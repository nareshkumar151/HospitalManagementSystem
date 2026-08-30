import type { RoleName } from '../../types'

export interface AuthUser {
  userId: number
  username: string
  email: string
  role: RoleName
  branchId: number | null
  linkedProfileId: number | null
}

export interface AuthState {
  user: AuthUser | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

export const AUTH_LOGIN_START = 'auth/loginStart'
export const AUTH_LOGIN_SUCCESS = 'auth/loginSuccess'
export const AUTH_LOGIN_FAILURE = 'auth/loginFailure'
export const AUTH_LOGOUT = 'auth/logout'
export const AUTH_RESTORE_SESSION = 'auth/restoreSession'

interface LoginStartAction { type: typeof AUTH_LOGIN_START }
interface LoginSuccessAction { type: typeof AUTH_LOGIN_SUCCESS; payload: AuthUser }
interface LoginFailureAction { type: typeof AUTH_LOGIN_FAILURE; payload: string }
interface LogoutAction { type: typeof AUTH_LOGOUT }
interface RestoreSessionAction { type: typeof AUTH_RESTORE_SESSION; payload: AuthUser | null }

export type AuthAction = LoginStartAction | LoginSuccessAction | LoginFailureAction | LogoutAction | RestoreSessionAction
