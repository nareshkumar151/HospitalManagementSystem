import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import type { AttendanceDto } from '../../types'

interface EmployeeLite {
  id: number
  fullName: string
}

// Deliberately loose (not the full LeaveRequestDto): this only reads which employee, which date range,
// and whether it's Approved, so it accepts either the self-service LeaveRequestDto or the generic
// admin-page LeaveRequestRow (features/generic/resources.ts) without either side needing a cast.
interface LeaveRangeLite {
  employeeId: number
  fromDate: string
  toDate: string
  status: string
}

interface AttendanceMonthMatrixProps {
  month: string // 'yyyy-MM-dd', any day within the target month
  employees: EmployeeLite[]
  attendanceRows: AttendanceDto[]
  leaveRequests: LeaveRangeLite[]
}

type DayStatus = 'present' | 'absent' | 'leave' | 'weekend' | 'future'

const STATUS_STYLE: Record<DayStatus, string> = {
  present: 'bg-success-500/15 text-success-500',
  absent: 'bg-danger-500/15 text-danger-500',
  leave: 'bg-warning-500/15 text-warning-500',
  weekend: 'bg-ink-100 text-ink-500',
  future: 'bg-transparent text-ink-300',
}

const STATUS_LETTER: Record<DayStatus, string> = { present: 'P', absent: 'A', leave: 'L', weekend: '·', future: '' }

/**
 * A classic HR "attendance sheet" - one row per employee, one column per day of the selected month.
 * Built client-side from three already-fetched pieces (employees, that month's raw Attendance rows, and
 * the full leave-request list) rather than a bespoke pre-pivoted endpoint, so the same three data sources
 * already used elsewhere on the page (and cached by Redux) drive this widget too.
 */
export function AttendanceMonthMatrix({ month, employees, attendanceRows, leaveRequests }: AttendanceMonthMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

  const { year, monthIndex, daysInMonth, today } = useMemo(() => {
    const d = new Date(month)
    const year = d.getFullYear()
    const monthIndex = d.getMonth()
    return { year, monthIndex, daysInMonth: new Date(year, monthIndex + 1, 0).getDate(), today: new Date() }
  }, [month])

  // employeeId -> day-of-month -> attendance row, for O(1) lookups while rendering the grid.
  const attendanceByEmployeeDay = useMemo(() => {
    const map = new Map<number, Map<number, AttendanceDto>>()
    for (const row of attendanceRows) {
      const day = new Date(row.attendanceDate).getDate()
      if (!map.has(row.employeeId)) map.set(row.employeeId, new Map())
      map.get(row.employeeId)!.set(day, row)
    }
    return map
  }, [attendanceRows])

  // employeeId -> set of days covered by an Approved leave request overlapping this month.
  const approvedLeaveByEmployeeDay = useMemo(() => {
    const map = new Map<number, Set<number>>()
    for (const leave of leaveRequests) {
      if (leave.status !== 'Approved') continue
      const from = new Date(leave.fromDate)
      const to = new Date(leave.toDate)
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthIndex, day)
        if (date >= new Date(from.getFullYear(), from.getMonth(), from.getDate()) && date <= new Date(to.getFullYear(), to.getMonth(), to.getDate())) {
          if (!map.has(leave.employeeId)) map.set(leave.employeeId, new Set())
          map.get(leave.employeeId)!.add(day)
        }
      }
    }
    return map
  }, [leaveRequests, daysInMonth, year, monthIndex])

  function statusFor(employeeId: number, day: number): DayStatus {
    const date = new Date(year, monthIndex, day)
    if (date > today) return 'future'
    if (attendanceByEmployeeDay.get(employeeId)?.get(day)?.checkIn) return 'present'
    if (approvedLeaveByEmployeeDay.get(employeeId)?.has(day)) return 'leave'
    if (date.getDay() === 0) return 'weekend' // Sunday weekly-off
    return 'absent'
  }

  function summaryFor(employeeId: number) {
    let present = 0, absent = 0, leave = 0
    for (let day = 1; day <= daysInMonth; day++) {
      const status = statusFor(employeeId, day)
      if (status === 'present') present++
      else if (status === 'absent') absent++
      else if (status === 'leave') leave++
    }
    return { present, absent, leave }
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-ink-100">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-surface-muted text-ink-500">
              <th className="sticky left-0 z-10 bg-surface-muted px-3 py-2.5 font-semibold uppercase tracking-wide">Employee</th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const isWeekend = new Date(year, monthIndex, day).getDay() === 0
                return (
                  <th key={day} className={clsx('w-8 min-w-8 px-0.5 py-2.5 text-center font-medium', isWeekend && 'text-ink-300')}>
                    {day}
                  </th>
                )
              })}
              <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-wide">P / A / L</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, rowIndex) => {
              const { present, absent, leave } = summaryFor(employee.id)
              return (
                <motion.tr
                  key={employee.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(rowIndex * 0.03, 0.3) }}
                  className="border-t border-ink-100"
                >
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-2 font-medium text-ink-900">{employee.fullName}</td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const status = statusFor(employee.id, day)
                    const record = attendanceByEmployeeDay.get(employee.id)?.get(day)
                    const cellKey = `${employee.id}-${day}`
                    const title = record?.checkIn
                      ? `In: ${new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${record.checkOut ? ` · Out: ${new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`
                      : status[0].toUpperCase() + status.slice(1)
                    return (
                      <td key={day} className="px-0.5 py-1.5 text-center" onMouseEnter={() => setHoveredCell(cellKey)} onMouseLeave={() => setHoveredCell(null)}>
                        <span
                          title={title}
                          className={clsx(
                            'mx-auto flex h-5 w-5 items-center justify-center rounded-[5px] text-[10px] font-bold transition-transform',
                            STATUS_STYLE[status],
                            hoveredCell === cellKey && status !== 'future' && 'scale-125'
                          )}
                        >
                          {STATUS_LETTER[status]}
                        </span>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-center font-medium text-ink-700 whitespace-nowrap">
                    <span className="text-success-500">{present}</span>
                    {' / '}
                    <span className="text-danger-500">{absent}</span>
                    {' / '}
                    <span className="text-warning-500">{leave}</span>
                  </td>
                </motion.tr>
              )
            })}
            {employees.length === 0 && (
              <tr><td colSpan={daysInMonth + 2} className="px-4 py-8 text-center text-ink-500">No employees to show.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-500">
        {(['present', 'absent', 'leave', 'weekend'] as DayStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={clsx('flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold', STATUS_STYLE[status])}>{STATUS_LETTER[status]}</span>
            {status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : status === 'leave' ? 'On Leave' : 'Weekly Off'}
          </span>
        ))}
      </div>
    </div>
  )
}
