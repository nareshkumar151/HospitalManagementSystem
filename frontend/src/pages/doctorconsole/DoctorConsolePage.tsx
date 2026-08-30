import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Stethoscope, FlaskConical, Pill, CheckCircle2, BedDouble, History, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchAppointments } from '../../features/appointments/appointmentsSlice'
import { completeConsultation, fetchPatientVisits, startConsultation } from '../../features/opd/opdSlice'
import { createPrescription } from '../../features/prescriptions/prescriptionsSlice'
import { fetchLabCatalog, orderLabTest } from '../../features/laboratory/laboratorySlice'
import { fetchMedicines } from '../../features/pharmacy/pharmacySlice'
import { fetchDepartments } from '../../features/doctors/doctorsSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { HandwritingField } from '../../components/clinical/HandwritingField'
import { extractErrorMessage } from '../../api/client'
import type { OpdVisitDto } from '../../types'

interface RxItem { medicineId: number; dosage: string; frequency: string; durationDays: number; instructions: string }

export function DoctorConsolePage() {
  const dispatch = useAppDispatch()
  const doctorId = useAppSelector((state) => state.auth.user?.linkedProfileId)
  const { list: appointments } = useAppSelector((state) => state.appointments)
  const { current: visit } = useAppSelector((state) => state.opd)
  const { catalog } = useAppSelector((state) => state.laboratory)
  const { medicines } = useAppSelector((state) => state.pharmacy)
  const { departments } = useAppSelector((state) => state.doctors)

  const today = new Date().toISOString().slice(0, 10)
  const [busyAppointmentId, setBusyAppointmentId] = useState<number | null>(null)

  const [diagnosis, setDiagnosis] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [admissionRecommended, setAdmissionRecommended] = useState(false)
  const [referredToDepartmentId, setReferredToDepartmentId] = useState<number | ''>('')
  const [rxItems, setRxItems] = useState<RxItem[]>([])
  const [savingConsultation, setSavingConsultation] = useState(false)
  const [labTestId, setLabTestId] = useState<number | ''>('')
  const [pastVisits, setPastVisits] = useState<OpdVisitDto[]>([])
  const [historyOpen, setHistoryOpen] = useState(true)
  const [historyStatus, setHistoryStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')

  useEffect(() => {
    if (doctorId) dispatch(fetchAppointments({ doctorId, date: today }))
    dispatch(fetchLabCatalog())
    dispatch(fetchMedicines({ pageSize: 200 }))
    dispatch(fetchDepartments())
  }, [dispatch, doctorId, today])

  const resetConsultationForm = () => {
    setDiagnosis(''); setSymptoms(''); setClinicalNotes(''); setAdmissionRecommended(false)
    setReferredToDepartmentId(''); setRxItems([])
  }

  // Surface the patient's prior symptoms/diagnosis/notes (typed or hand-written) so the doctor has context
  // before writing this visit's own.
  const loadPatientHistory = (patientId: number, currentVisitId: number) => {
    setHistoryStatus('loading')
    dispatch(fetchPatientVisits(patientId))
      .then((visits) => {
        setPastVisits(visits.filter((v) => v.id !== currentVisitId))
        setHistoryStatus('loaded')
      })
      .catch(() => setHistoryStatus('error'))
  }

  const handleStart = async (appointmentId: number) => {
    setBusyAppointmentId(appointmentId)
    try {
      const started = await dispatch(startConsultation(appointmentId))
      resetConsultationForm()
      setHistoryOpen(true)
      setPastVisits([])
      loadPatientHistory(started.patientId, started.id)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setBusyAppointmentId(null)
    }
  }

  const addRxItem = () => setRxItems((items) => [...items, { medicineId: 0, dosage: '', frequency: '', durationDays: 5, instructions: '' }])
  const updateRxItem = (index: number, patch: Partial<RxItem>) =>
    setRxItems((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  const removeRxItem = (index: number) => setRxItems((items) => items.filter((_, i) => i !== index))

  const handleCompleteConsultation = async () => {
    if (!visit || !diagnosis.trim()) {
      toast.error('Diagnosis is required to complete a consultation.')
      return
    }
    setSavingConsultation(true)
    try {
      await dispatch(completeConsultation(visit.id, {
        symptoms: symptoms || undefined,
        diagnosis,
        clinicalNotes: clinicalNotes || undefined,
        admissionRecommended,
        referredToDepartmentId: referredToDepartmentId || undefined,
      }))

      const validItems = rxItems.filter((item) => item.medicineId && item.dosage && item.frequency)
      if (validItems.length > 0) {
        await dispatch(createPrescription({ patientId: visit.patientId, opdVisitId: visit.id, items: validItems }))
      }

      toast.success('Consultation completed.')
      if (doctorId) dispatch(fetchAppointments({ doctorId, date: today }))
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSavingConsultation(false)
    }
  }

  const handleOrderLabTest = async () => {
    if (!visit || !labTestId) return
    try {
      await dispatch(orderLabTest({ patientId: visit.patientId, labTestCatalogId: Number(labTestId), opdVisitId: visit.id }))
      toast.success('Lab test ordered.')
      setLabTestId('')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const scheduledAppointments = appointments?.items.filter((a) => a.status === 'Scheduled') ?? []

  return (
    <div>
      <PageHeader title="Doctor Console" subtitle="Today's OPD queue and active consultation workspace." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><Stethoscope size={16} /> Today's Queue</h3>
          <div className="space-y-2">
            {scheduledAppointments.length ? scheduledAppointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-ink-900">#{a.tokenNumber} · {a.patientName}</p>
                  <p className="text-xs text-ink-500">{a.timeSlot}</p>
                </div>
                <Button size="sm" loading={busyAppointmentId === a.id} onClick={() => handleStart(a.id)}>Start</Button>
              </div>
            )) : <p className="text-sm text-ink-500">No patients waiting.</p>}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><CheckCircle2 size={16} /> Active Consultation</h3>
          {!visit ? (
            <p className="text-sm text-ink-500">Start a consultation from the queue to begin.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2.5 text-sm">
                <span className="font-medium text-brand-800">{visit.patientName} · {visit.opdVisitNumber}</span>
                <Badge tone={visit.isFreeFollowUp ? 'success' : 'brand'}>{visit.isFreeFollowUp ? 'Free follow-up' : `Fee ₹${visit.consultationFee}`}</Badge>
              </div>

              <div className="rounded-xl border border-ink-100">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((open) => !open)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-semibold text-ink-900"
                >
                  <span className="flex items-center gap-1.5">
                    <History size={15} /> Patient History
                    {historyStatus === 'loaded' && ` (${pastVisits.length} past visit${pastVisits.length === 1 ? '' : 's'})`}
                  </span>
                  {historyOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                {historyOpen && (
                  <div className="max-h-80 space-y-4 overflow-y-auto border-t border-ink-100 p-3">
                    {historyStatus === 'loading' && <p className="text-sm text-ink-500">Loading history…</p>}
                    {historyStatus === 'error' && (
                      <div className="flex items-center justify-between text-sm text-danger-500">
                        <span>Couldn't load this patient's history.</span>
                        <Button size="sm" variant="secondary" onClick={() => loadPatientHistory(visit.patientId, visit.id)}>Retry</Button>
                      </div>
                    )}
                    {historyStatus === 'loaded' && pastVisits.length === 0 && (
                      <p className="text-sm text-ink-500">No previous visits for this patient.</p>
                    )}
                    {historyStatus === 'loaded' && pastVisits.map((v) => (
                      <div key={v.id} className="space-y-2 rounded-lg bg-surface-muted p-3">
                        <p className="text-xs font-medium text-ink-500">{new Date(v.visitDateTime).toLocaleString()} · Dr. {v.doctorName}</p>
                        <HandwritingField label="Symptoms" value={v.symptoms ?? ''} readOnly />
                        <HandwritingField label="Diagnosis" value={v.diagnosis ?? ''} readOnly />
                        <HandwritingField label="Clinical notes" value={v.clinicalNotes ?? ''} readOnly />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <HandwritingField key={`symptoms-${visit.id}`} label="Symptoms" value={symptoms} onChange={setSymptoms} />
              <HandwritingField key={`diagnosis-${visit.id}`} label="Diagnosis" required value={diagnosis} onChange={setDiagnosis} />
              <HandwritingField key={`clinical-notes-${visit.id}`} label="Clinical notes" multiline value={clinicalNotes} onChange={setClinicalNotes} />

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm text-ink-700">
                  <input type="checkbox" checked={admissionRecommended} onChange={(e) => setAdmissionRecommended(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-500" />
                  <BedDouble size={15} /> Recommend admission
                </label>
                <Select label="Refer to department" value={referredToDepartmentId} onChange={(e) => setReferredToDepartmentId(Number(e.target.value) || '')}>
                  <option value="">No referral</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </div>

              <div className="rounded-xl border border-ink-100 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900"><Pill size={15} /> Prescription</h4>
                  <Button size="sm" variant="secondary" onClick={addRxItem}>+ Add medicine</Button>
                </div>
                {rxItems.length === 0 && <p className="text-xs text-ink-500">No medicines added yet.</p>}
                <div className="space-y-2">
                  {rxItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 rounded-lg bg-surface-muted p-2">
                      <select
                        className="col-span-4 rounded-md border border-ink-100 px-2 py-1.5 text-xs"
                        value={item.medicineId}
                        onChange={(e) => updateRxItem(index, { medicineId: Number(e.target.value) })}
                      >
                        <option value={0} disabled>Medicine</option>
                        {medicines?.items.map((m) => <option key={m.id} value={m.id}>{m.medicineName}</option>)}
                      </select>
                      <input className="col-span-2 rounded-md border border-ink-100 px-2 py-1.5 text-xs" placeholder="Dosage" value={item.dosage} onChange={(e) => updateRxItem(index, { dosage: e.target.value })} />
                      <input className="col-span-2 rounded-md border border-ink-100 px-2 py-1.5 text-xs" placeholder="Frequency" value={item.frequency} onChange={(e) => updateRxItem(index, { frequency: e.target.value })} />
                      <input type="number" className="col-span-1 rounded-md border border-ink-100 px-2 py-1.5 text-xs" placeholder="Days" value={item.durationDays} onChange={(e) => updateRxItem(index, { durationDays: Number(e.target.value) })} />
                      <input className="col-span-2 rounded-md border border-ink-100 px-2 py-1.5 text-xs" placeholder="Instructions" value={item.instructions} onChange={(e) => updateRxItem(index, { instructions: e.target.value })} />
                      <button onClick={() => removeRxItem(index)} className="col-span-1 text-xs text-danger-500">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-ink-100 p-3">
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-900"><FlaskConical size={15} /> Order Lab Test</h4>
                <div className="flex gap-2">
                  <select className="flex-1 rounded-md border border-ink-100 px-2 py-1.5 text-sm" value={labTestId} onChange={(e) => setLabTestId(Number(e.target.value) || '')}>
                    <option value="">Select a test</option>
                    {catalog.map((t) => <option key={t.id} value={t.id}>{t.testName} · ₹{t.price}</option>)}
                  </select>
                  <Button size="sm" variant="secondary" onClick={handleOrderLabTest} disabled={!labTestId}>Order</Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button loading={savingConsultation} onClick={handleCompleteConsultation}>Complete Consultation</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
