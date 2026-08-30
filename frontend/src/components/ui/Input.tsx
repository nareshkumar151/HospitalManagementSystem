import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'

interface FieldWrapperProps {
  label?: string
  error?: string
  hint?: string
  children: ReactNode
}

function FieldWrapper({ label, error, hint, children }: FieldWrapperProps) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-danger-500">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-500">{hint}</span>
      ) : null}
    </label>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, className, ...rest }, ref) => (
  <FieldWrapper label={label} error={error} hint={hint}>
    <input
      ref={ref}
      className={clsx(
        'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-shadow placeholder:text-ink-500/70',
        'focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400',
        error ? 'border-danger-500' : 'border-ink-100',
        className
      )}
      {...rest}
    />
  </FieldWrapper>
))
Input.displayName = 'Input'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, hint, className, children, ...rest }, ref) => (
  <FieldWrapper label={label} error={error} hint={hint}>
    <select
      ref={ref}
      className={clsx(
        'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-shadow',
        'focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400',
        error ? 'border-danger-500' : 'border-ink-100',
        className
      )}
      {...rest}
    >
      {children}
    </select>
  </FieldWrapper>
))
Select.displayName = 'Select'
