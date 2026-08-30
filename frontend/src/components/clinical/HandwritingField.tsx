import { useState } from 'react'
import { Keyboard, PenLine } from 'lucide-react'
import clsx from 'clsx'
import { HandwritingPad } from './HandwritingPad'

/** A clinical text field's value doubles as a stylus capture when it holds a base64 PNG data URI. */
export function isHandwritingCapture(value: string | null | undefined): value is string {
  return !!value && value.startsWith('data:image')
}

interface HandwritingFieldProps {
  label: string
  value: string
  onChange?: (value: string) => void
  required?: boolean
  multiline?: boolean
  readOnly?: boolean
  padHeight?: number
}

/**
 * Symptoms / Diagnosis / Clinical Notes can be typed or hand-written with a stylus - the underlying value
 * is always a single `string`, either prose or a `data:image/png;base64,...` capture from HandwritingPad,
 * so it round-trips through the exact same OpdVisit field the backend already had (see 07_OpdVisits.sql).
 */
export function HandwritingField({ label, value, onChange, required, multiline, readOnly, padHeight }: HandwritingFieldProps) {
  const [mode, setMode] = useState<'type' | 'draw'>(isHandwritingCapture(value) ? 'draw' : 'type')

  if (readOnly) {
    return (
      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
        {isHandwritingCapture(value) ? (
          <img src={value} alt={`${label} (handwritten)`} className="max-h-56 w-full rounded-lg border border-ink-100 bg-white object-contain" />
        ) : value ? (
          <p className="whitespace-pre-wrap rounded-lg bg-surface-muted px-3.5 py-2.5 text-sm text-ink-700">{value}</p>
        ) : (
          <p className="text-xs italic text-ink-400">Not recorded.</p>
        )}
      </div>
    )
  }

  const switchMode = (next: 'type' | 'draw') => {
    if (next === mode) return
    if (value && !window.confirm('Switching input mode will clear the current content. Continue?')) return
    onChange?.('')
    setMode(next)
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-ink-700">{label}{required && ' *'}</span>
        <div className="inline-flex rounded-md border border-ink-100 bg-surface-muted p-0.5 text-xs">
          <button
            type="button"
            onClick={() => switchMode('type')}
            className={clsx('flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors', mode === 'type' ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-500 hover:text-ink-700')}
          >
            <Keyboard size={12} /> Type
          </button>
          <button
            type="button"
            onClick={() => switchMode('draw')}
            className={clsx('flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors', mode === 'draw' ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-500 hover:text-ink-700')}
          >
            <PenLine size={12} /> Stylus
          </button>
        </div>
      </div>

      {mode === 'type' ? (
        multiline ? (
          <textarea
            rows={3}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-full rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-shadow focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-full rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-shadow focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40"
          />
        )
      ) : (
        <HandwritingPad value={value} onChange={(v) => onChange?.(v)} height={padHeight} />
      )}
    </div>
  )
}
