import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Bell, BellRing, CalendarClock, CheckCheck, ChevronDown, Clock, FlaskConical,
  LogOut, Pill, Receipt, User,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { logout } from '../../features/auth/authActions'
import { notificationResource, type NotificationRow } from '../../features/generic/resources'
import { apiClient } from '../../api/client'

const POLL_INTERVAL_MS = 20_000

const CATEGORY_ICON: Record<string, typeof CalendarClock> = {
  Appointment: CalendarClock,
  LabReady: FlaskConical,
  Medicine: Pill,
  Billing: Receipt,
  FollowUp: Clock,
}

const CATEGORY_TONE: Record<string, string> = {
  Appointment: 'bg-brand-100 text-brand-600',
  LabReady: 'bg-amber-100 text-warning-500',
  Medicine: 'bg-purple-100 text-purple-600',
  Billing: 'bg-green-100 text-success-500',
  FollowUp: 'bg-ink-100 text-ink-600',
}

function timeAgo(iso: string): string {
  // The API serializes DateTime values as UTC but without a trailing 'Z' (Dapper doesn't set
  // DateTimeKind.Utc), so the browser would otherwise parse them as local time - append it explicitly.
  const utcIso = /[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(utcIso).getTime()) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function NotificationBell() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { list } = useAppSelector((state) => state.notifications)
  const items = list?.items ?? []
  const [open, setOpen] = useState(false)
  const [marking, setMarking] = useState<number | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const seenIdsRef = useRef<Set<number> | null>(null)

  const unread = items.filter((n) => !n.isRead)

  // The bell only ever needs the most recent handful for its dropdown, plus enough of the unread backlog
  // to size the badge (display caps at "9+" anyway) - a small fixed page is enough, no need to ever pull
  // a user's entire notification history just to poll for new arrivals.
  const refresh = () => dispatch(notificationResource.fetchPage({ pageNumber: 1, pageSize: 20 }))

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch])

  // Toast the newest arrival(s) once we know what "already seen" looks like - skip the very first load so
  // a doctor isn't greeted with a wall of toasts replaying their entire unread backlog on every page visit.
  useEffect(() => {
    const seen = seenIdsRef.current
    if (seen) {
      const fresh = items.filter((n) => !n.isRead && !seen.has(n.id))
      fresh.forEach((n) => {
        const Icon = CATEGORY_ICON[n.category] ?? Bell
        toast.custom((t) => (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: t.visible ? 1 : 0, y: t.visible ? 0 : -12, scale: t.visible ? 1 : 0.95 }}
            className="flex max-w-sm items-start gap-3 rounded-xl border border-ink-100 bg-surface px-4 py-3 shadow-[var(--shadow-pop)]"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <Icon size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">New notification</p>
              <p className="text-xs text-ink-600">{n.message}</p>
            </div>
          </motion.div>
        ))
      })
    }
    seenIdsRef.current = new Set(items.map((n) => n.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const markRead = async (id: number) => {
    setMarking(id)
    try {
      await apiClient.put(`/notifications/${id}/read`)
      refresh()
    } finally {
      setMarking(null)
    }
  }

  const markAllRead = async () => {
    if (unread.length === 0) return
    await Promise.all(unread.map((n) => apiClient.put(`/notifications/${n.id}/read`)))
    refresh()
  }

  const recent = items.slice(0, 6)

  return (
    <div className="relative" ref={wrapperRef}>
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
        aria-label="Notifications"
      >
        {unread.length > 0 ? <BellRing size={19} /> : <Bell size={19} />}
        <AnimatePresence>
          {unread.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface"
            >
              {unread.length > 9 ? '9+' : unread.length}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-[var(--shadow-pop)]"
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-ink-900">Notifications</h3>
              {unread.length > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {recent.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-ink-400"><Bell size={18} /></span>
                  <p className="text-sm text-ink-500">You're all caught up.</p>
                </div>
              ) : (
                recent.map((n: NotificationRow) => {
                  const Icon = CATEGORY_ICON[n.category] ?? Bell
                  const tone = CATEGORY_TONE[n.category] ?? 'bg-ink-100 text-ink-600'
                  return (
                    <div
                      key={n.id}
                      className={`flex gap-3 border-b border-ink-100 px-4 py-3 last:border-b-0 ${n.isRead ? '' : 'bg-brand-50/60'}`}
                    >
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug text-ink-900">{n.message}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-ink-400">{timeAgo(n.createdAt)}</span>
                          {!n.isRead && (
                            <button
                              onClick={() => markRead(n.id)}
                              disabled={marking === n.id}
                              className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                      {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                    </div>
                  )
                })
              )}
            </div>

            <button
              onClick={() => { setOpen(false); navigate('/app/notifications') }}
              className="block w-full border-t border-ink-100 py-2.5 text-center text-sm font-medium text-brand-600 hover:bg-surface-muted"
            >
              View all notifications
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Topbar() {
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 px-4 md:px-6">
      <div />
      <div className="flex items-center gap-3">
        <NotificationBell />

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
