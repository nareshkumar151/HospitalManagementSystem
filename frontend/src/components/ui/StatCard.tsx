import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: 'brand' | 'success' | 'warning' | 'danger'
  hint?: string
}

const toneClasses = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-green-50 text-success-500',
  warning: 'bg-amber-50 text-warning-500',
  danger: 'bg-red-50 text-danger-500',
}

export function StatCard({ label, value, icon: Icon, tone = 'brand', hint }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
        <motion.p
          key={String(value)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="break-words text-2xl font-semibold leading-tight text-ink-900"
        >
          {value}
        </motion.p>
        {hint && <p className="text-xs text-ink-500">{hint}</p>}
      </div>
    </Card>
  )
}
