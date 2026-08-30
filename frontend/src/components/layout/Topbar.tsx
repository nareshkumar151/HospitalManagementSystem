import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronDown, LogOut, User } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { logout } from '../../features/auth/authActions'

export function Topbar() {
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 px-4 md:px-6">
      <div />
      <div className="flex items-center gap-3">
        <button className="relative rounded-full p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900">
          <Bell size={19} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger-500" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-ink-100 py-1 pl-1 pr-2.5 hover:bg-surface-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
              {user?.username?.[0]?.toUpperCase() ?? '?'}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-ink-900">{user?.username}</span>
              <span className="block text-xs leading-tight text-ink-500">{user?.role}</span>
            </span>
            <ChevronDown size={14} className="text-ink-500" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-ink-100 bg-surface py-1 shadow-[var(--shadow-pop)]"
              >
                <button
                  onClick={() => { setMenuOpen(false); navigate('/app/profile') }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-ink-700 hover:bg-surface-muted"
                >
                  <User size={15} /> Profile
                </button>
                <button
                  onClick={() => { dispatch(logout()); navigate('/login') }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-danger-500 hover:bg-red-50"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
