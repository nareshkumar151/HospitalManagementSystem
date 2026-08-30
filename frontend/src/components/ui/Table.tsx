import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  rows: T[]
  keyField: (row: T) => string | number
  emptyMessage?: string
  loading?: boolean
}

export function Table<T>({ columns, rows, keyField, emptyMessage = 'No records found.', loading }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-100">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-surface-muted text-xs font-semibold uppercase tracking-wide text-ink-500">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-ink-500">Loading…</td></tr>
          )}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-ink-500">{emptyMessage}</td></tr>
          )}
          {!loading && rows.map((row, index) => (
            <motion.tr
              key={keyField(row)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(index * 0.02, 0.3) }}
              className="border-t border-ink-100 hover:bg-surface-muted/70 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-ink-700 ${col.className ?? ''}`}>{col.render(row)}</td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
