import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarClock, Check, Clock, Users, UserCheck, UserX, ClipboardList, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { leaveRequestResource, type LeaveRequestRow } from '../../features/generic/resources'
import { fetchAttendanceForMonth, fetchAttendanceHistory, fetchAttendanceSummary } from '../../features/attendance/attendanceSlice'
import { fetchEmployees } from '../../features/employees/employeesSlice'
import { apiClient, extractErrorMessage } from '../../api/client'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatCard } from '../../components/ui/StatCard'
import { Table, type Column } from '../../components/ui/Table'
import { Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { AttendanceMonthMatrix } from '../../components/attendance/AttendanceMonthMatrix'
import type { AttendanceDto } from '../../types'

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function AttendanceLeavePage() {
  const dispatch = useAppDispatch()
  const { items, status } = useAppSelector((state) => state.leaveRequests)
  const { list: employees } = useAppSelector((state) => state.employees)
  const { history, monthMatrix, summary, status: attendanceStatus } = useAppSelector((state) => state.attendance)
  const [checkInEmployeeId, setCheckInEmployeeId] = useState<number | ''>('')
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue())

  const refreshLeaveRequests = () => dispatch(leaveRequestResource.fetchAll())

  useEffect(() => {
    refreshLeaveRequests()
    dispatch(fetchEmployees({ pageSize: 100 }))
    dispatch(fetchAttendanceSummary())
  }, [dispatch])

  useEffect(() => {
    dispatch(fetchAttendanceForMonth(`${selectedMonth}-01`))
  }, [dispatch, selectedMonth])

  useEffect(() => {
    if (checkInEmployeeId) dispatch(fetchAttendanceHistory(checkInEmployeeId))
  }, [dispatch, checkInEmployeeId])

  const review = async (id: number, statusValue: 'Approved' | 'Rejected') => {
    try {
      await apiClient.put(`/attendance/leave-requests/${id}/review`, { status: statusValue })
      toast.success(`Leave request ${statusValue.toLowerCase()}.`)
      refreshLeaveRequests()
      dispatch(fetchAttendanceSummary())
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const checkIn = async () => {
    if (!checkInEmployeeId) return
    try {
      await apiClient.post('/attendance/check-in', { employeeId: checkInEmployeeId, shift: 'General' })
      toast.success('Checked in.')
      dispatch(fetchAttendanceHistory(checkInEmployeeId))
      dispatch(fetchAttendanceForMonth(`${selectedMonth}-01`))
      dispatch(fetchAttendanceSummary())
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const checkOut = async () => {
    if (!checkInEmployeeId) return
    try {
      await apiClient.post('/attendance/check-out', { employeeId: checkInEmployeeId })
      toast.success('Checked out.')
      dispatch(fetchAttendanceHistory(checkInEmployeeId))
      dispatch(fetchAttendanceForMonth(`${selectedMonth}-01`))
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const leaveColumns: Column<LeaveRequestRow>[] = [
    { key: 'employee', header: 'Employee', render: (l) => l.employeeName },
    { key: 'from', header: 'From', render: (l) => new Date(l.fromDate).toLocaleDateString() },
    { key: 'to', header: 'To', render: (l) => new Date(l.toDate).toLocaleDateString() },
    { key: 'reason', header: 'Reason', render: (l) => l.reason },
    { key: 'status', header: 'Status', render: (l) => <Badge>{l.status}</Badge> },
    {
      key: 'actions', header: '', render: (l) => l.status === 'Requested' ? (
        <div className="flex gap-3">
          <button onClick={() => review(l.id, 'Approved')} className="flex items-center gap-1 text-xs font-medium text-success-500 hover:underline"><Check size={12} /> Approve</button>
          <button onClick={() => review(l.id, 'Rejected')} className="flex items-center gap-1 text-xs font-medium text-danger-500 hover:underline"><X size={12} /> Reject</button>
        </div>
      ) : null,
    },
  ]

  const historyColumns: Column<AttendanceDto>[] = [
    { key: 'date', header: 'Date', render: (a) => new Date(a.attendanceDate).toLocaleDateString() },
    { key: 'checkin', header: 'Check In', render: (a) => a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
    { key: 'checkout', header: 'Check Out', render: (a) => a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
    { key: 'overtime', header: 'Overtime', render: (a) => `${a.overtimeHours} hrs` },
    { key: 'shift', header: 'Shift', render: (a) => a.shift },
  ]

  return (
    <div>
      <PageHeader title="Attendance & Leave" subtitle="Live headcount, month-wise attendance across every employee, and leave approvals." />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Employees" value={summary?.totalEmployees ?? 0} icon={Users} tone="brand" />
        <StatCard label="Present Today" value={summary?.presentToday ?? 0} icon={UserCheck} tone="success" />
        <StatCard label="On Leave Today" value={summary?.onLeaveToday ?? 0} icon={UserX} tone="warning" />
        <StatCard label="Pending Approvals" value={summary?.pendingLeaveRequests ?? 0} icon={ClipboardList} tone="danger" />
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Clock size={16} /> Month-wise Attendance</h3>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-ink-100 px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
          />
        </div>
        <div className="mt-4">
          <AttendanceMonthMatrix
            month={`${selectedMonth}-01`}
            employees={employees?.items ?? []}
            attendanceRows={monthMatrix}
            leaveRequests={items}
          />
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><CalendarClock size={16} /> Check-in / Check-out &amp; Employee Detail</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <Select label="Employee" value={checkInEmployeeId} onChange={(e) => setCheckInEmployeeId(Number(e.target.value) || '')}>
              <option value="">Select employee</option>
              {employees?.items.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </Select>
          </div>
          <Button variant="secondary" disabled={!checkInEmployeeId} onClick={checkIn}>Check In</Button>
          <Button variant="secondary" disabled={!checkInEmployeeId} onClick={checkOut}>Check Out</Button>
        </div>

        {checkInEmployeeId && (
          <div className="mt-4">
            <Table columns={historyColumns} rows={history} keyField={(a) => a.id} loading={attendanceStatus === 'loading'} emptyMessage="No attendance recorded for this employee yet." />
          </div>
        )}
      </Card>

      <Card padded={false}>
        <div className="p-4">
          <Table columns={leaveColumns} rows={items} keyField={(l) => l.id} loading={status === 'loading'} emptyMessage="No leave requests." />
        </div>
      </Card>
    </div>
  )
}
