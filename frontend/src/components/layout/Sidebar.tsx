import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAppSelector } from '../../app/hooks'
import { navItems } from './navConfig'

export function Sidebar() {
  const role = useAppSelector((state) => state.auth.user?.role)
  const visibleItems = navItems.filter((item) => role && item.roles.includes(role))

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-100 bg-surface md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img src="/logo-icon.png" alt="Effisys Group" className="h-9 w-9 shrink-0 object-contain" />
        <div>
          <p className="text-sm font-semibold text-ink-900 leading-tight">Effisys Group</p>
          <p className="text-xs text-ink-500 leading-tight">Hospital Management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'text-brand-700' : 'text-ink-700 hover:bg-surface-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-brand-50"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <item.icon size={18} className="relative z-10 shrink-0" />
                <span className="relative z-10">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
