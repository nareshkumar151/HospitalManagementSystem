import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'

interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/** Debounced-by-caller search input, styled to match the Patients/Appointments search boxes. */
export function SearchBox({ value, onChange, placeholder = 'Search…', className = 'w-full max-w-sm' }: SearchBoxProps) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ink-100 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
      />
    </div>
  )
}

interface PaginationBarProps {
  pageNumber: number
  totalPages: number
  totalCount: number
  onPageChange: (page: number) => void
  extra?: ReactNode
}

/** "Page X of Y · N total" footer with Previous/Next, matching the Patients page pager. */
export function PaginationBar({ pageNumber, totalPages, totalCount, onPageChange, extra }: PaginationBarProps) {
  if (totalPages <= 1 && !extra) return null
  return (
    <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-sm text-ink-500">
      <span>{extra ?? `Page ${pageNumber} of ${totalPages || 1} · ${totalCount} total`}</span>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={pageNumber <= 1} onClick={() => onPageChange(pageNumber - 1)}>Previous</Button>
          <Button variant="secondary" size="sm" disabled={pageNumber >= totalPages} onClick={() => onPageChange(pageNumber + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
