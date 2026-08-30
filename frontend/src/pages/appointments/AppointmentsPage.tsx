import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { bookAppointment, cancelAppointment, fetchAppointments, fetchDoctorSlots } from '../../features/appointments/appointmentsSlice'
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
  const user = useAppSelector((state) => state.auth.user)
  const { list, slots } = useAppSelector((state) => state.appointments)
  const { list: patients } = useAppSelector((state) => state.patients)
  const { list: doctors, departments } = useAppSelector((state) => state.doctors)

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [modalOpen, setModalOpen] = useState(false)
  const [patientId, setPatientId] = useState<number | null>(null)
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [doctorId, setDoctorId] = useState<number | null>(null)
  const [bookDate, setBookDate] = useState(new Date().toISOString().slice(0, 10))
  const [slot, setSlot] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    dispatch(fetchAppointments({ date }))
  }, [dispatch, date])

  useEffect(() => {
    dispatch(fetchDoctors())
    dispatch(fetchDepartments())
    dispatch(fetchPatients({ pageSize: 100 }))
  }, [dispatch])

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
      dispatch(fetchAppointments({ date }))
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
      dispatch(fetchAppointments({ date }))
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const columns: Column<AppointmentDto>[] = [
    { key: 'token', header: 'Token', render: (a) => <span className="font-mono text-xs">#{a.tokenNumber}</span> },
    { key: 'patient', header: 'Patient', render: (a) => a.patientName },
    { key: 'doctor', header: 'Doctor', render: (a) => a.doctorName },
    { key: 'dept', header: 'Department', render: (a) => a.departmentName },
    { key: 'slot', header: 'Slot', render: (a) => a.timeSlot },
    { key: 'type', header: 'Type', render: (a) => <Badge tone="neutral">{a.type}</Badge> },
    { key: 'status', header: 'Status', render: (a) => <Badge>{a.status}</Badge> },
    {
      key: 'actions', header: '', render: (a) => a.status === 'Scheduled' ? (
        <button onClick={() => handleCancel(a.id)} className="flex items-center gap-1 text-xs font-medium text-danger-500 hover:underline">
          <X size={13} /> Cancel
        </button>
      ) : null,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Book, view, and manage OPD appointments by date."
        actions={<Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Book Appointment</Button>}
      />

      <Card padded={false}>
        <div className="flex items-center gap-3 border-b border-ink-100 p-4">
          <label className="text-sm font-medium text-ink-700">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-ink-100 px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
        </div>
        <div className="p-4">
          <Table columns={columns} rows={list?.items ?? []} keyField={(a) => a.id} emptyMessage="No appointments for this date." />
        </div>
      </Card>

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
              {slots.map((s) => <option key={s.timeSlot} value={s.timeSlot} disabled={s.isBooked}>{s.timeSlot}{s.isBooked ? ' (booked)' : ''}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBook} loading={submitting} disabled={!patientId || !doctorId || !slot}>Confirm Booking</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
