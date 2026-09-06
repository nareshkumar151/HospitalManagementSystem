import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import {
  fetchErNurseAssessments, recordErNurseAssessment, fetchErDoctorAssessments, recordErDoctorAssessment,
} from '../../features/er/erSlice'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { downloadFile, extractErrorMessage } from '../../api/client'
import type { ErVisitDto } from '../../types'

const DISPOSITIONS = ['Admit', 'Discharge', 'LAMA', 'Refer', 'DeceasedInEr']

export function ErVisitFormsModal({ visit, role, onClose }: { visit: ErVisitDto; role: string | undefined; onClose: () => void }) {
  const dispatch = useAppDispatch()
  const { nurseAssessments, doctorAssessments } = useAppSelector((state) => state.er)
  const [tab, setTab] = useState<'Nurse' | 'Doctor'>('Nurse')

  useEffect(() => {
    dispatch(fetchErNurseAssessments(visit.id))
    dispatch(fetchErDoctorAssessments(visit.id))
  }, [dispatch, visit.id])

  const downloadPdf = () =>
    downloadFile(`/er/visits/${visit.id}/pdf`, `ErVisit-${visit.id}.pdf`).catch(() => toast.error('Could not download the PDF.'))

  return (
    <Modal open onClose={onClose} title={`ER Visit · ${visit.patientName} (${visit.uhid})`} widthClassName="max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-ink-600">Chief complaint: <strong>{visit.chiefComplaint}</strong> · Triage <Badge tone={visit.triageCategory === 'Red' ? 'danger' : visit.triageCategory === 'Yellow' ? 'warning' : 'success'}>{visit.triageCategory}</Badge></p>
        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={downloadPdf}>Download PDF</Button>
      </div>
      <div className="mb-4 flex gap-1 border-b border-ink-100 pb-2">
        <button onClick={() => setTab('Nurse')} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === 'Nurse' ? 'bg-brand-500 text-white' : 'text-ink-700 hover:bg-surface-muted'}`}>ER Nurses Assessment</button>
        <button onClick={() => setTab('Doctor')} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === 'Doctor' ? 'bg-brand-500 text-white' : 'text-ink-700 hover:bg-surface-muted'}`}>ER Doctor Assessment</button>
      </div>

      {tab === 'Nurse' && <NurseAssessmentTab visitId={visit.id} canRecord={role === 'Nurse'} history={nurseAssessments} />}
      {tab === 'Doctor' && (
        <DoctorAssessmentTab
          visitId={visit.id} canRecord={role === 'Doctor'} history={doctorAssessments}
          patientId={visit.patientId} patientName={visit.patientName} onClose={onClose}
        />
      )}
    </Modal>
  )
}

function NurseAssessmentTab({ visitId, canRecord, history }: { visitId: number; canRecord: boolean; history: import('../../types').ErNurseAssessmentDto[] }) {
  const dispatch = useAppDispatch()
  const [form, setForm] = useState({ bloodPressure: '', pulse: '', temperature: '', respiratoryRate: '', spO2: '', painScore: '', gcsTotal: '15', initialActions: '', remarks: '' })
  const [submitting, setSubmitting] = useState(false)

  const save = async () => {
    setSubmitting(true)
    try {
      await dispatch(recordErNurseAssessment(visitId, {
        bloodPressure: form.bloodPressure || undefined,
        pulse: form.pulse ? Number(form.pulse) : undefined,
        temperature: form.temperature ? Number(form.temperature) : undefined,
        respiratoryRate: form.respiratoryRate ? Number(form.respiratoryRate) : undefined,
        spO2: form.spO2 ? Number(form.spO2) : undefined,
        painScore: form.painScore ? Number(form.painScore) : undefined,
        gcsTotal: form.gcsTotal ? Number(form.gcsTotal) : undefined,
        initialActions: form.initialActions || undefined,
        remarks: form.remarks || undefined,
      }))
      toast.success('Nurse assessment recorded.')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {canRecord && (
        <div className="space-y-3 rounded-lg border border-ink-100 p-3">
          <div className="grid grid-cols-3 gap-2">
            <Input label="BP" placeholder="120/80" value={form.bloodPressure} onChange={(e) => setForm({ ...form, bloodPressure: e.target.value })} />
            <Input label="Pulse" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} />
            <Input label="Temp (°F)" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
            <Input label="Resp. rate" value={form.respiratoryRate} onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })} />
            <Input label="SpO2 (%)" value={form.spO2} onChange={(e) => setForm({ ...form, spO2: e.target.value })} />
            <Input label="Pain (0-10)" value={form.painScore} onChange={(e) => setForm({ ...form, painScore: e.target.value })} />
          </div>
          <Input label="GCS Total (3-15)" value={form.gcsTotal} onChange={(e) => setForm({ ...form, gcsTotal: e.target.value })} />
          <Input label="Initial actions" value={form.initialActions} onChange={(e) => setForm({ ...form, initialActions: e.target.value })} />
          <Input label="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          <Button loading={submitting} onClick={save}>Record Assessment</Button>
        </div>
      )}
      <div className="space-y-2">
        {history.map((h) => (
          <div key={h.id} className="rounded-lg bg-surface-muted p-3 text-sm">
            <p className="mb-1 text-xs font-medium text-ink-500">{new Date(h.assessedAt).toLocaleString()} · {h.nurseName}</p>
            <div className="flex flex-wrap gap-3 text-ink-700">
              {h.bloodPressure && <span>BP {h.bloodPressure}</span>}
              {h.pulse != null && <span>Pulse {h.pulse}</span>}
              {h.temperature != null && <span>Temp {h.temperature}°F</span>}
              {h.respiratoryRate != null && <span>RR {h.respiratoryRate}</span>}
              {h.spO2 != null && <span>SpO2 {h.spO2}%</span>}
              {h.painScore != null && <span>Pain {h.painScore}/10</span>}
              {h.gcsTotal != null && <span>GCS {h.gcsTotal}</span>}
            </div>
            {h.initialActions && <p className="mt-1 text-xs text-ink-600">Actions: {h.initialActions}</p>}
          </div>
        ))}
        {history.length === 0 && <p className="text-sm text-ink-500">No nurse assessment recorded yet.</p>}
      </div>
    </div>
  )
}

function DoctorAssessmentTab({ visitId, canRecord, history, patientId, patientName, onClose }: {
  visitId: number; canRecord: boolean; history: import('../../types').ErDoctorAssessmentDto[]
  patientId: number; patientName: string; onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [form, setForm] = useState({ historyOfPresentIllness: '', examinationFindings: '', provisionalDiagnosis: '', treatmentGiven: '', disposition: 'Admit', remarks: '' })
  const [submitting, setSubmitting] = useState(false)

  const save = async () => {
    setSubmitting(true)
    try {
      await dispatch(recordErDoctorAssessment(visitId, {
        historyOfPresentIllness: form.historyOfPresentIllness || undefined,
        examinationFindings: form.examinationFindings || undefined,
        provisionalDiagnosis: form.provisionalDiagnosis || undefined,
        treatmentGiven: form.treatmentGiven || undefined,
        disposition: form.disposition,
        remarks: form.remarks || undefined,
      }))
      if (form.disposition === 'Admit') {
        // ER only flips the visit's own status to "Admitted" - it doesn't create a real IPD admission, so
        // without this the patient would never actually appear on the IPD/Admissions list. Hand off to
        // whoever completes admissions (front desk/nursing) with the patient already selected.
        toast.success(`${patientName} marked for admission - opening Admit Patient…`)
        onClose()
        navigate('/app/ipd', { state: { guidedPatientId: patientId } })
      } else {
        toast.success('Doctor assessment recorded - visit disposition updated.')
      }
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {canRecord && (
        <div className="space-y-3 rounded-lg border border-ink-100 p-3">
          <Input label="History of present illness" value={form.historyOfPresentIllness} onChange={(e) => setForm({ ...form, historyOfPresentIllness: e.target.value })} />
          <Input label="Examination findings" value={form.examinationFindings} onChange={(e) => setForm({ ...form, examinationFindings: e.target.value })} />
          <Input label="Provisional diagnosis" value={form.provisionalDiagnosis} onChange={(e) => setForm({ ...form, provisionalDiagnosis: e.target.value })} />
          <Input label="Treatment given" value={form.treatmentGiven} onChange={(e) => setForm({ ...form, treatmentGiven: e.target.value })} />
          <Select label="Disposition" value={form.disposition} onChange={(e) => setForm({ ...form, disposition: e.target.value })}>
            {DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Input label="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          <Button loading={submitting} onClick={save}>Record Assessment & Set Disposition</Button>
        </div>
      )}
      <div className="space-y-2">
        {history.map((h) => (
          <div key={h.id} className="rounded-lg bg-surface-muted p-3 text-sm">
            <p className="mb-1 text-xs font-medium text-ink-500">{new Date(h.assessedAt).toLocaleString()} · {h.doctorName} · <Badge>{h.disposition}</Badge></p>
            {h.provisionalDiagnosis && <p className="text-ink-700">Dx: {h.provisionalDiagnosis}</p>}
            {h.treatmentGiven && <p className="mt-1 text-xs text-ink-600">Treatment: {h.treatmentGiven}</p>}
          </div>
        ))}
        {history.length === 0 && <p className="text-sm text-ink-500">No doctor assessment recorded yet.</p>}
      </div>
    </div>
  )
}
