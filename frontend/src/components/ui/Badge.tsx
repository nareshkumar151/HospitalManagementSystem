import clsx from 'clsx'
import type { ReactNode } from 'react'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-100 text-brand-700',
  success: 'bg-green-100 text-success-500',
  warning: 'bg-amber-100 text-warning-500',
  danger: 'bg-red-100 text-danger-500',
}

const STATUS_TONE: Record<string, Tone> = {
  Scheduled: 'brand', Completed: 'success', Cancelled: 'danger', Rescheduled: 'warning',
  Admitted: 'brand', Discharged: 'success', Available: 'success', Occupied: 'danger',
  Pending: 'warning', Paid: 'success', PartiallyPaid: 'warning', Draft: 'neutral', Refunded: 'neutral',
  Active: 'brand', Dispensed: 'success', Ordered: 'brand', SampleCollected: 'warning',
  ReportUploaded: 'brand', Reviewed: 'success', Approved: 'success', Rejected: 'danger', Submitted: 'warning',
}

export function Badge({ children, tone }: { children: ReactNode; tone?: Tone }) {
  const resolvedTone = tone ?? (typeof children === 'string' ? STATUS_TONE[children] : undefined) ?? 'neutral'
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', toneClasses[resolvedTone])}>
      {children}
    </span>
  )
}
