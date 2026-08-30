import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarPlus, Download, FileText, IndianRupee, Receipt } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchAppointments, bookAppointment, fetchDoctorSlots } from '../../features/appointments/appointmentsSlice'
import { fetchDoctors, fetchDepartments } from '../../features/doctors/doctorsSlice'
import { createRazorpayOrder, fetchBillsByPatient, verifyRazorpayPayment } from '../../features/billing/billingSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { downloadFile, extractErrorMessage } from '../../api/client'
import { openRazorpayCheckout } from '../../utils/razorpay'
import type { BillDto } from '../../types'

export function PatientPortalPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const patientId = user?.linkedProfileId
  const { list: appointments } = useAppSelector((state) => state.appointments)
  const { list: doctors, departments } = useAppSelector((state) => state.doctors)
  const { slots } = useAppSelector((state) => state.appointments)
  const { byPatient: bills } = useAppSelector((state) => state.billing)

  const [modalOpen, setModalOpen] = useState(false)
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [doctorId, setDoctorId] = useState<number | null>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [slot, setSlot] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [payingBillId, setPayingBillId] = useState<number | null>(null)

  const doctorsInDepartment = doctors?.items.filter((d) => !departmentId || d.departmentId === departmentId) ?? []

  useEffect(() => {
    if (patientId) {
      dispatch(fetchAppointments({ mine: true }))
      dispatch(fetchBillsByPatient(patientId))
    }
    dispatch(fetchDoctors())
    dispatch(fetchDepartments())
  }, [dispatch, patientId])

  useEffect(() => {
    if (doctorId && date) dispatch(fetchDoctorSlots(doctorId, date))
  }, [dispatch, doctorId, date])

  const handleBook = async () => {
    if (!patientId || !doctorId || !slot) return
    const doctor = doctors?.items.find((d) => d.id === doctorId)
    if (!doctor) return
    setSubmitting(true)
    try {
      await dispatch(bookAppointment({
        patientId, doctorId, departmentId: doctor.departmentId, appointmentDate: date, timeSlot: slot, type: 'Online', branchId: user?.branchId ?? 1,
      }))
      toast.success('Appointment booked!')
      setModalOpen(false)
      dispatch(fetchAppointments({ mine: true }))
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayOnline = async (bill: BillDto) => {
    setPayingBillId(bill.id)
    try {
      const order = await dispatch(createRazorpayOrder(bill.id))
      const result = await openRazorpayCheckout({
        keyId: order.razorpayKeyId,
        amountInPaise: order.amountInPaise,
        currency: order.currency,
        orderId: order.razorpayOrderId,
        patientName: user?.username,
        patientEmail: user?.email,
      })
      await dispatch(verifyRazorpayPayment({
        billId: bill.id,
        razorpayOrderId: result.razorpay_order_id,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySignature: result.razorpay_signature,
      }))
      toast.success('Payment successful!')
      if (patientId) dispatch(fetchBillsByPatient(patientId))
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Online payment could not be completed.'))
    } finally {
      setPayingBillId(null)
    }
  }

  const handleDownloadReceipt = async (bill: BillDto) => {
    try {
      await downloadFile(`/billing/${bill.id}/pdf`, `Receipt-${bill.billNumber}.pdf`)
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not download the receipt.'))
    }
  }

  return (
    <div>
      <PageHeader
        title="My Health Portal"
        subtitle="Book appointments and keep track of your visits and bills."
        actions={<Button icon={<CalendarPlus size={16} />} onClick={() => setModalOpen(true)}>Book Appointment</Button>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><FileText size={16} /> My Appointments</h3>
          <div className="space-y-2">
            {appointments?.items.length ? appointments.items.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-ink-900">{a.doctorName} · {a.departmentName}</p>
                  <p className="text-xs text-ink-500">{new Date(a.appointmentDate).toLocaleDateString()} · {a.timeSlot} · Token #{a.tokenNumber}</p>
                </div>
                <Badge>{a.status}</Badge>
              </div>
            )) : <p className="text-sm text-ink-500">No appointments yet.</p>}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><Receipt size={16} /> My Bills</h3>
          <div className="space-y-2">
            {bills.length ? bills.map((b) => (
              <div key={b.id} className="rounded-lg bg-surface-muted px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink-900">{b.billNumber} · {b.type}</p>
                    <p className="text-xs text-ink-500">₹{b.totalAmount.toLocaleString('en-IN')} · Paid ₹{b.paidAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <Badge>{b.status}</Badge>
                </div>
                <div className="mt-2 flex gap-3">
                  {b.status !== 'Paid' && (
                    <button onClick={() => handlePayOnline(b)} disabled={payingBillId === b.id} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline disabled:opacity-50">
                      <IndianRupee size={12} /> {payingBillId === b.id ? 'Processing…' : 'Pay Online'}
                    </button>
                  )}
                  <button onClick={() => handleDownloadReceipt(b)} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:underline">
                    <Download size={12} /> Receipt
                  </button>
                </div>
              </div>
            )) : <p className="text-sm text-ink-500">No bills yet.</p>}
          </div>
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Book an Appointment">
        <div className="space-y-4">
          <Select
            label="Department"
            value={departmentId ?? ''}
            onChange={(e) => { setDepartmentId(Number(e.target.value) || null); setDoctorId(null) }}
          >
            <option value="" disabled>Select a department</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select label="Doctor" value={doctorId ?? ''} onChange={(e) => setDoctorId(Number(e.target.value) || null)}>
            <option value="" disabled>Select a doctor</option>
            {doctorsInDepartment.map((d) => <option key={d.id} value={d.id}>{d.fullName} · ₹{d.consultationFee}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Date</span>
              <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-ink-100 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
            </label>
            <Select label="Time slot" value={slot} onChange={(e) => setSlot(e.target.value)}>
              <option value="" disabled>Select a slot</option>
              {slots.map((s) => <option key={s.timeSlot} value={s.timeSlot} disabled={s.isBooked}>{s.timeSlot}{s.isBooked ? ' (booked)' : ''}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBook} loading={submitting} disabled={!doctorId || !slot}>Confirm Booking</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
