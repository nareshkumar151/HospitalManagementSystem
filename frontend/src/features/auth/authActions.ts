import { apiClient, extractErrorMessage, tokenStorage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { LoginResponse } from '../../types'
import { AUTH_LOGIN_FAILURE, AUTH_LOGIN_START, AUTH_LOGIN_SUCCESS, AUTH_LOGOUT, AUTH_RESTORE_SESSION, type AuthUser } from './authTypes'
import { getUserFromStoredToken } from './sessionFromToken'

function toAuthUser(response: LoginResponse): AuthUser {
  return {
    userId: response.userId,
    username: response.username,
    email: response.email,
    role: response.role,
    branchId: response.branchId,
    linkedProfileId: response.linkedProfileId,
  }
}

export const login = (usernameOrEmail: string, password: string): AppThunk<Promise<void>> =>
  async (dispatch) => {
    dispatch({ type: AUTH_LOGIN_START })
    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', { usernameOrEmail, password })
      tokenStorage.setTokens(data.accessToken, data.refreshToken)
      dispatch({ type: AUTH_LOGIN_SUCCESS, payload: toAuthUser(data) })
    } catch (error) {
      dispatch({ type: AUTH_LOGIN_FAILURE, payload: extractErrorMessage(error, 'Invalid username or password.') })
      throw error
    }
  }

export const registerPatient = (payload: {
  fullName: string; mobile: string; email: string; password: string; gender: string; dateOfBirth?: string
}): AppThunk<Promise<void>> =>
  async (dispatch) => {
    dispatch({ type: AUTH_LOGIN_START })
    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/register-patient', payload)
      tokenStorage.setTokens(data.accessToken, data.refreshToken)
      dispatch({ type: AUTH_LOGIN_SUCCESS, payload: toAuthUser(data) })
    } catch (error) {
      dispatch({ type: AUTH_LOGIN_FAILURE, payload: extractErrorMessage(error, 'Could not create your account.') })
      throw error
    }
  }

export const logout = (): AppThunk<void> => (dispatch) => {
  // Capture both tokens *before* clearing storage - the revoke call below needs the still-valid access
  // token to pass this endpoint's [Authorize], and apiClient's request interceptor reads it from storage
  // at send time. Clearing first (as this used to) meant every logout sent that call with no Authorization
  // header, so it 401'd and the refresh token was never actually revoked server-side.
  const accessToken = tokenStorage.getAccessToken()
  const refreshToken = tokenStorage.getRefreshToken()
  tokenStorage.clear()
  dispatch({ type: AUTH_LOGOUT })
  if (refreshToken) {
    // Fire-and-forget server-side revoke; the client is already logged out locally either way.
    apiClient.post('/auth/logout', { refreshToken }, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => undefined)
  }
}

// authReducer already seeds its initial state from getUserFromStoredToken() synchronously (so the first
// render is never wrong), so this thunk mainly matters for the rare case something external changed the
// stored token without a login/logout action dispatching in between.
export const restoreSession = (): AppThunk<void> => (dispatch) => {
  dispatch({ type: AUTH_RESTORE_SESSION, payload: getUserFromStoredToken() })
}
