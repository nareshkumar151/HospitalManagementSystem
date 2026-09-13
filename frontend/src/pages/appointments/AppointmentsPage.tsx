import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, Send, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import {
  bookAppointment, cancelAppointment, fetchAppointments, fetchDoctorSlots,
  requestAppointmentAction, fetchPendingAppointmentRequests, resolveAppointmentRequest,
} from '../../features/appointments/appointmentsSlice'
import { fetchDoctors, fetchDepartments } from '../../features/doctors/doctorsSlice'
import { fetchPatients } from '../../features/patients/patientsSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { extractErrorMessage } from '../../api/client'
import type { AppointmentDto } from '../../types'

export function AppointmentsPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const guidedPatientId = (location.state as { guidedPatientId?: number } | null)?.guidedPatientId
  const user = useAppSelector((state) => state.auth.user)
  const { list, slots, pendingRequests } = useAppSelector((state) => state.appointments)
  const { list: patients } = useAppSelector((state) => state.patients)
  const { list: doctors, departments } = useAppSelector((state) => state.doctors)
  const isDoctor = user?.role === 'Doctor'
  const canResolveRequests = user?.role === 'SuperAdmin' || user?.role === 'Administrator' || user?.role === 'Receptionist'

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(!!guidedPatientId)
  const [patientId, setPatientId] = useState<number | null>(guidedPatientId ?? null)
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [doctorId, setDoctorId] = useState<number | null>(null)
  const [bookDate, setBookDate] = useState(new Date().toISOString().slice(0, 10))
  const [slot, setSlot] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [requestTarget, setRequestTarget] = useState<AppointmentDto | null>(null)
  const [requestType, setRequestType] = useState<'Cancel' | 'Transfer' | 'Refer'>('Cancel')
  const [requestReason, setRequestReason] = useState('')
  const [requestSubmitting, setRequestSubmitting] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => dispatch(fetchAppointments({ date, search })), 300)
    return () => clearTimeout(timeout)
  }, [dispatch, date, search])

  useEffect(() => {
    dispatch(fetchDoctors())
    dispatch(fetchDepartments())
    dispatch(fetchPatients({ pageSize: 100 }))
    if (canResolveRequests) dispatch(fetchPendingAppointmentRequests())
  }, [dispatch, canResolveRequests])

  // A patient should already be selected when the booking form opens, not force picking one from a blank
  // dropdown every time - defaults to the first patient on file until the receptionist picks a different one.
  useEffect(() => {
    if (!patientId && patients?.items.length) setPatientId(patients.items[0].id)
  }, [patients, patientId])

  useEffect(() => {
    if (doctorId && bookDate) dispatch(fetchDoctorSlots(doctorId, bookDate))
  }, [dispatch, doctorId, bookDate])

  const doctorsInDept = doctors?.items.filter((d) => !departmentId || d.departmentId === departmentId) ?? []

  const handleBook = async () => {
    if (!patientId || !doctorId || !departmentId || !slot) return
    setSubmitting(true)
    try {
      await dispatch(bookAppointment({ patientId, doctorId, departmentId, appointmentDate: bookDate, timeSlot: slot, type: 'WalkIn', branchId: user?.branchId ?? 1 }))
      toast.success('Appointment booked.')
      setModalOpen(false)
      dispatch(fetchAppointments({ date, search }))
      // Booking naturally continues into billing the patient for the visit - carry them along so the
      // receptionist doesn't have to search for them again on the Billing page.
      navigate('/app/billing', { state: { guidedPatientId: patientId } })
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id: number) => {
    const reason = window.prompt('Reason for cancellation:')
    if (!reason) return
    try {
      await dispatch(cancelAppointment(id, reason))
      toast.success('Appointment cancelled.')
      dispatch(fetchAppointments({ date, search }))
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const openRequestModal = (a: AppointmentDto) => {
    setRequestTarget(a); setRequestType('Cancel'); setRequestReason('')
  }

  const handleSubmitRequest = async () => {
    if (!requestTarget || !requestReason.trim()) return
    setRequestSubmitting(true)
    try {
      await dispatch(requestAppointmentAction(requestTarget.id, requestType, requestReason.trim()))
      toast.success('Request sent to the front desk.')
      setRequestTarget(null)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setRequestSubmitting(false)
    }
  }

  const handleResolveRequest = async (id: number, status: 'Approved' | 'Rejected') => {
    try {
      await dispatch(resolveAppointmentRequest(id, status))
      toast.success(status === 'Approved' ? 'Request approved - appointment cancelled.' : 'Request rejected.')
      dispatch(fetchAppointments({ date, search }))
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const columns: Column<AppointmentDto>[] = [
    { key: 'token', header: 'Token', render: (a) => <span className="font-mono text-xs">#{a.tokenNumber}</span> },
    { key: 'patient', header: 'Patient', render: (a) => a.patientName },
    { key: 'uhid', header: 'UHID', render: (a) => <span className="font-mono text-xs text-ink-500">{a.uhid}</span> },
    { key: 'mobile', header: 'Mobile', render: (a) => a.patientMobile },
    { key: 'doctor', header: 'Doctor', render: (a) => a.doctorName },
    { key: 'dept', header: 'Department', render: (a) => a.departmentName },
    { key: 'slot', header: 'Slot', render: (a) => a.timeSlot },
    { key: 'type', header: 'Type', render: (a) => <Badge tone="neutral">{a.type}</Badge> },
    { key: 'status', header: 'Status', render: (a) => <Badge>{a.status}</Badge> },
    {
      key: 'actions', header: '', render: (a) => a.status === 'Scheduled' ? (
        isDoctor ? (
          // A doctor may only request action on their own appointment - the list shows every doctor's slots.
          a.doctorId === user?.linkedProfileId ? (
            <button onClick={() => openRequestModal(a)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              <Send size={13} /> Request Cancel/Transfer/Refer
            </button>
          ) : null
        ) : (
          <button onClick={() => handleCancel(a.id)} className="flex items-center gap-1 text-xs font-medium text-danger-500 hover:underline">
            <X size={13} /> Cancel
          </button>
        )
      ) : null,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Book, view, and manage OPD appointments by date."
        actions={!isDoctor ? <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Book Appointment</Button> : undefined}
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 p-4">
          <label className="text-sm font-medium text-ink-700">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-ink-100 px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
          <div className="relative ml-auto w-full max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by UHID, mobile, or patient name…"
              className="w-full rounded-lg border border-ink-100 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
            />
          </div>
        </div>
        <div className="p-4">
          <Table columns={columns} rows={list?.items ?? []} keyField={(a) => a.id} emptyMessage="No appointments for this date." />
        </div>
      </Card>

      {canResolveRequests && pendingRequests.length > 0 && (
        <Card className="mt-4" padded={false}>
          <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
            <Send size={16} /> Doctor Requests (Cancel / Transfer / Refer)
          </div>
          <div className="space-y-2 p-4">
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-surface-muted p-3 text-sm">
                <div>
                  <p className="flex items-center gap-2 font-medium text-ink-900">
                    <Badge tone="warning">{r.requestType}</Badge>
                    {r.patientName} · {r.doctorName} · {new Date(r.appointmentDate).toLocaleDateString()} {r.timeSlot}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">{r.reason}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="success" onClick={() => handleResolveRequest(r.id, 'Approved')}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => handleResolveRequest(r.id, 'Rejected')}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Book Appointment">
        <div className="space-y-4">
          <Select label="Patient" value={patientId ?? ''} onChange={(e) => setPatientId(Number(e.target.value) || null)}>
            <option value="" disabled>Select a patient</option>
            {patients?.items.map((p) => <option key={p.id} value={p.id}>{p.fullName} · {p.mobile}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Department" value={departmentId ?? ''} onChange={(e) => { setDepartmentId(Number(e.target.value) || null); setDoctorId(null) }}>
              <option value="" disabled>Select department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Select label="Doctor" value={doctorId ?? ''} onChange={(e) => setDoctorId(Number(e.target.value) || null)}>
              <option value="" disabled>Select doctor</option>
              {doctorsInDept.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Date</span>
              <input type="date" value={bookDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setBookDate(e.target.value)}
                className="w-full rounded-lg border border-ink-100 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
            </label>
            <Select label="Time slot" value={slot} onChange={(e) => setSlot(e.target.value)}>
              <option value="" disabled>Select a slot</option>
              {slots.map((s) => <option key={s.timeSlot} value={s.timeSlot} disabled={s.isBooked || s.isPast}>{s.timeSlot}{s.isBooked ? ' (booked)' : s.isPast ? ' (passed)' : ''}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBook} loading={submitting} disabled={!patientId || !doctorId || !slot}>Confirm Booking</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!requestTarget} onClose={() => setRequestTarget(null)} title="Request Cancel / Transfer / Refer">
        {requestTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              {requestTarget.patientName} · {new Date(requestTarget.appointmentDate).toLocaleDateString()} {requestTarget.timeSlot}
            </p>
            <Select label="Request type" value={requestType} onChange={(e) => setRequestType(e.target.value as 'Cancel' | 'Transfer' | 'Refer')}>
              <option value="Cancel">Cancel</option>
              <option value="Transfer">Transfer</option>
              <option value="Refer">Refer</option>
            </Select>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Reason</span>
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40"
              />
            </label>
            <p className="text-xs text-ink-500">This sends a request to the front desk - you cannot cancel the appointment directly.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setRequestTarget(null)}>Close</Button>
              <Button loading={requestSubmitting} disabled={!requestReason.trim()} onClick={handleSubmitRequest}>Send Request</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
