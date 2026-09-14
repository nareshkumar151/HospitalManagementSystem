import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from '../../hooks/useTheme'

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

/** Light/Dark/System switcher - see useTheme for how the choice is applied and persisted. Mirrors
 * LanguageSwitcher's dropdown styling so the two sit naturally next to each other in the Topbar. */
export function ThemeToggle() {
  const { preference, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const active = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[2]
  const ActiveIcon = active.icon

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Theme"
        className="flex items-center gap-1.5 rounded-full border border-ink-100 px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:bg-surface-muted"
      >
        <ActiveIcon size={14} className="text-ink-500" />
        <span className="hidden sm:inline">{active.label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-40 mt-2 w-36 overflow-hidden rounded-xl border border-ink-100 bg-surface py-1 shadow-[var(--shadow-pop)]"
          >
            {OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => { setTheme(option.value); setOpen(false) }}
                className="flex w-full items-center justify-between px-3.5 py-2 text-sm text-ink-700 hover:bg-surface-muted"
              >
                <span className="flex items-center gap-2">
                  <option.icon size={14} className="text-ink-500" />
                  {option.label}
                </span>
                {preference === option.value && <Check size={14} className="text-brand-600" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
