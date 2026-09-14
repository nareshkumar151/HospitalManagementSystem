import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Stethoscope, FlaskConical, Pill, CheckCircle2, BedDouble, History, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchAppointments } from '../../features/appointments/appointmentsSlice'
import { completeConsultation, fetchDoctorVisits, fetchPatientVisits, resumeVisit, startConsultation } from '../../features/opd/opdSlice'
import { createPrescription } from '../../features/prescriptions/prescriptionsSlice'
import { fetchLabCatalog, orderLabTest } from '../../features/laboratory/laboratorySlice'
import { fetchMedicines } from '../../features/pharmacy/pharmacySlice'
import { fetchDepartments } from '../../features/doctors/doctorsSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { HandwritingField } from '../../components/clinical/HandwritingField'
import { extractErrorMessage } from '../../api/client'
import type { OpdVisitDto } from '../../types'

interface RxItem { medicineId: number; dosage: string; frequency: string; durationDays: number; instructions: string }

export function DoctorConsolePage() {
  const dispatch = useAppDispatch()
  const doctorId = useAppSelector((state) => state.auth.user?.linkedProfileId)
  const { list: appointments } = useAppSelector((state) => state.appointments)
  const { current: visit, todaysVisits } = useAppSelector((state) => state.opd)
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
  const [selectedLabTestIds, setSelectedLabTestIds] = useState<number[]>([])
  const [labTestSearch, setLabTestSearch] = useState('')
  const [orderingLabTests, setOrderingLabTests] = useState(false)
  const [pastVisits, setPastVisits] = useState<OpdVisitDto[]>([])
  const [historyOpen, setHistoryOpen] = useState(true)
  const [historyStatus, setHistoryStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')

  useEffect(() => {
    if (doctorId) {
      dispatch(fetchAppointments({ doctorId, date: today }))
      // Needed to resume an already-started (InProgress) consultation - see handleResume below - since the
      // active-consultation panel only otherwise exists in memory for as long as the tab that started it.
      dispatch(fetchDoctorVisits(doctorId, today))
    }
    dispatch(fetchLabCatalog())
    dispatch(fetchMedicines({ pageSize: 200 }))
    dispatch(fetchDepartments())
  }, [dispatch, doctorId, today])

  const resetConsultationForm = () => {
    setDiagnosis(''); setSymptoms(''); setClinicalNotes(''); setAdmissionRecommended(false)
    setReferredToDepartmentId(''); setRxItems([]); setSelectedLabTestIds([]); setLabTestSearch('')
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
      // Starting moves the appointment to InProgress (not Completed - see StartConsultationAsync) - refetch
      // both so the queue below re-labels it "In Progress" (with a Resume action) right away, and so the
      // newly-created visit is available to resume from if the doctor navigates away before completing it.
      if (doctorId) {
        dispatch(fetchAppointments({ doctorId, date: today }))
        dispatch(fetchDoctorVisits(doctorId, today))
      }
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
      if (doctorId) {
        dispatch(fetchAppointments({ doctorId, date: today }))
        dispatch(fetchDoctorVisits(doctorId, today))
      }
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSavingConsultation(false)
    }
  }

  // Gets a doctor back into a consultation they'd already started (InProgress) but navigated away from or
  // reloaded the page before finishing - the visit itself was never lost (see StartConsultationAsync), only
  // the in-memory "active consultation" panel was. Note: any symptoms/diagnosis/notes typed before leaving
  // are not recovered here - those are never sent to the backend until Complete Consultation is pressed, so
  // this resumes a blank form against the same visit rather than restoring unsaved text.
  const handleResume = (appointmentId: number) => {
    const existingVisit = todaysVisits.find((v) => v.appointmentId === appointmentId)
    if (!existingVisit) {
      toast.error("Couldn't find this consultation's record - try refreshing the page.")
      return
    }
    resetConsultationForm()
    setHistoryOpen(true)
    setPastVisits([])
    dispatch(resumeVisit(existingVisit))
    loadPatientHistory(existingVisit.patientId, existingVisit.id)
  }

  const toggleLabTest = (id: number) =>
    setSelectedLabTestIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]))

  // One test per API call (the backend orders them one at a time), but the doctor picks the whole panel at
  // once instead of repeating "select a test, click Order" for every single test.
  const handleOrderLabTests = async () => {
    if (!visit || selectedLabTestIds.length === 0) return
    setOrderingLabTests(true)
    try {
      await Promise.all(selectedLabTestIds.map((id) =>
        dispatch(orderLabTest({ patientId: visit.patientId, labTestCatalogId: id, opdVisitId: visit.id }))
      ))
      toast.success(`${selectedLabTestIds.length} lab test${selectedLabTestIds.length === 1 ? '' : 's'} ordered.`)
      setSelectedLabTestIds([])
      setLabTestSearch('')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setOrderingLabTests(false)
    }
  }

  // In Progress stays visible (with a Resume action) instead of vanishing once started - a doctor who
  // navigates away or reloads mid-consultation needs a way back to that same patient (see handleResume).
  const queuedAppointments = appointments?.items.filter((a) => a.status === 'Scheduled' || a.status === 'InProgress') ?? []

  return (
    <div>
      <PageHeader title="Doctor Console" subtitle="Today's OPD queue and active consultation workspace." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><Stethoscope size={16} /> Today's Queue</h3>
          <div className="space-y-2">
            {queuedAppointments.length ? queuedAppointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-ink-900">#{a.tokenNumber} · {a.patientName}</p>
                  <p className="text-xs text-ink-500">
                    {a.timeSlot}{a.status === 'InProgress' && <span className="ml-1.5 font-medium text-warning-500">· In progress</span>}
                  </p>
                </div>
                {a.status === 'InProgress' ? (
                  <Button size="sm" variant="secondary" onClick={() => handleResume(a.id)}>Resume</Button>
                ) : (
                  <Button size="sm" loading={busyAppointmentId === a.id} onClick={() => handleStart(a.id)}>Start</Button>
                )}
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
              <div className="rounded-lg bg-brand-50 px-3 py-2.5 text-sm">
                <span className="font-medium text-brand-800">{visit.patientName} · {visit.opdVisitNumber}</span>
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

              <HandwritingField key={`symptoms-${visit.id}`} label="Symptoms" multiline value={symptoms} onChange={setSymptoms} />
              <HandwritingField key={`diagnosis-${visit.id}`} label="Diagnosis" required multiline value={diagnosis} onChange={setDiagnosis} />
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
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900"><FlaskConical size={15} /> Order Lab Test</h4>
                  {selectedLabTestIds.length > 0 && <span className="text-xs font-medium text-brand-600">{selectedLabTestIds.length} selected</span>}
                </div>
                <input
                  value={labTestSearch}
                  onChange={(e) => setLabTestSearch(e.target.value)}
                  placeholder="Search tests…"
                  className="mb-2 w-full rounded-md border border-ink-100 px-2 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                />
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-ink-100 p-1.5">
                  {catalog
                    .filter((t) => t.testName.toLowerCase().includes(labTestSearch.trim().toLowerCase()))
                    .map((t) => (
                      <label key={t.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted">
                        <input
                          type="checkbox"
                          checked={selectedLabTestIds.includes(t.id)}
                          onChange={() => toggleLabTest(t.id)}
                          className="h-4 w-4 rounded border-ink-300 text-brand-500"
                        />
                        {t.testName} <span className="text-xs text-ink-500">· ₹{t.price}</span>
                      </label>
                    ))}
                  {catalog.length > 0 && catalog.filter((t) => t.testName.toLowerCase().includes(labTestSearch.trim().toLowerCase())).length === 0 && (
                    <p className="px-2 py-1.5 text-xs text-ink-500">No matching tests.</p>
                  )}
                </div>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="secondary" loading={orderingLabTests} disabled={selectedLabTestIds.length === 0} onClick={handleOrderLabTests}>
                    Order {selectedLabTestIds.length > 0 ? `${selectedLabTestIds.length} Test${selectedLabTestIds.length === 1 ? '' : 's'}` : 'Tests'}
                  </Button>
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
