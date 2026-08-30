import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'
import type { RoleName } from '../types'

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: RoleName[] }) {
  const user = useAppSelector((state) => state.auth.user)

  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/app/dashboard" replace />

  return <Outlet />
}
