import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarClock, CalendarPlus, Clock } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { applyLeave, fetchAttendanceHistory, fetchMyLeaveRequests } from '../../features/attendance/attendanceSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { extractErrorMessage } from '../../api/client'
import type { AttendanceDto, LeaveRequestDto } from '../../types'

/**
 * Self-service for any role with an Employees row (Nurse, Pharmacist, Lab Technician, HR, Receptionist -
 * see RoleNames.EmployeeSelfService on the backend; Doctors are tracked separately and don't use this).
 * The API scopes /attendance/employee/{id} and /attendance/leave-requests to the caller's own record
 * automatically, so this page never has to know or trust its own employee id beyond what's in the JWT.
 */
export function MyAttendancePage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const employeeId = user?.linkedProfileId
  const { history, myLeaveRequests, status } = useAppSelector((state) => state.attendance)

  const [applyOpen, setApplyOpen] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const refresh = () => {
    if (!employeeId) return
    dispatch(fetchAttendanceHistory(employeeId))
    dispatch(fetchMyLeaveRequests())
  }

  useEffect(refresh, [dispatch, employeeId])

  const handleApplyLeave = async () => {
    if (!employeeId || !fromDate || !toDate || !reason) return
    setSubmitting(true)
    try {
      await dispatch(applyLeave({ employeeId, fromDate, toDate, reason }))
      toast.success('Leave request submitted.')
      setApplyOpen(false)
      setFromDate(''); setToDate(''); setReason('')
      dispatch(fetchMyLeaveRequests())
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const historyColumns: Column<AttendanceDto>[] = [
    { key: 'date', header: 'Date', render: (a) => new Date(a.attendanceDate).toLocaleDateString() },
    { key: 'checkin', header: 'Check In', render: (a) => a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
    { key: 'checkout', header: 'Check Out', render: (a) => a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
    { key: 'overtime', header: 'Overtime', render: (a) => `${a.overtimeHours} hrs` },
    { key: 'shift', header: 'Shift', render: (a) => a.shift },
  ]

  const leaveColumns: Column<LeaveRequestDto>[] = [
    { key: 'from', header: 'From', render: (l) => new Date(l.fromDate).toLocaleDateString() },
    { key: 'to', header: 'To', render: (l) => new Date(l.toDate).toLocaleDateString() },
    { key: 'reason', header: 'Reason', render: (l) => l.reason },
    { key: 'status', header: 'Status', render: (l) => <Badge>{l.status}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title="My Attendance"
        subtitle="Your check-in/check-out history and leave requests."
        actions={<Button icon={<CalendarPlus size={16} />} onClick={() => setApplyOpen(true)}>Apply for Leave</Button>}
      />

      <Card padded={false} className="mb-4">
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <Clock size={16} /> Check-in / Check-out History
        </div>
        <div className="p-4">
          <Table columns={historyColumns} rows={history} keyField={(a) => a.id} loading={status === 'loading'} emptyMessage="No attendance recorded yet - check-in is logged by HR/Admin at the front desk." />
        </div>
      </Card>

      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <CalendarClock size={16} /> My Leave Requests
        </div>
        <div className="p-4">
          <Table columns={leaveColumns} rows={myLeaveRequests} keyField={(l) => l.id} emptyMessage="No leave requests yet." />
        </div>
      </Card>

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for Leave">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">From date</span>
              <input type="date" value={fromDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-ink-100 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">To date</span>
              <input type="date" value={toDate} min={fromDate || new Date().toISOString().slice(0, 10)} onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-ink-100 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Reason</span>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-ink-100 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button loading={submitting} disabled={!fromDate || !toDate || !reason} onClick={handleApplyLeave}>Submit Request</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
