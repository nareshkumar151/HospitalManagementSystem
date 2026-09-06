import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Droplet, HeartPulse, Salad, Users } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchPatients } from '../../features/patients/patientsSlice'
import {
  fetchTransfusionReactions, recordTransfusionReaction, fetchDialysisSessions, recordDialysisSession,
  fetchNutritionAssessments, recordNutritionAssessment,
} from '../../features/newdepartments/newDepartmentsSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { SearchBox } from '../../components/ui/ListToolbar'
import { downloadFile, extractErrorMessage } from '../../api/client'

type Dept = 'BloodBank' | 'Dialysis' | 'Nutrition'

const DEPTS: { key: Dept; label: string; icon: typeof Droplet }[] = [
  { key: 'BloodBank', label: 'Blood Bank · Transfusion Reaction', icon: Droplet },
  { key: 'Dialysis', label: 'Dialysis Record', icon: HeartPulse },
  { key: 'Nutrition', label: 'Nutrition Assessment', icon: Salad },
]

export function NewDepartmentsPage() {
  const dispatch = useAppDispatch()
  const { list: patientList } = useAppSelector((state) => state.patients)

  const [dept, setDept] = useState<Dept>('BloodBank')
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<{ id: number; fullName: string } | null>(null)

  useEffect(() => {
    const handle = setTimeout(() => {
      if (patientSearch.trim().length >= 2) dispatch(fetchPatients({ pageNumber: 1, pageSize: 6, search: patientSearch }))
    }, 300)
    return () => clearTimeout(handle)
  }, [dispatch, patientSearch])

  return (
    <div>
      <PageHeader title="Blood Bank · Dialysis · Nutrition" subtitle="Transfusion reaction reporting, dialysis records, and nutrition assessments." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><Users size={16} /> Select Patient</h3>
          <SearchBox value={patientSearch} onChange={setPatientSearch} placeholder="Search by name or UHID…" className="w-full" />
          <div className="mt-2 space-y-1">
            {(patientList?.items ?? []).map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedPatient({ id: p.id, fullName: p.fullName }); setPatientSearch('') }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted"
              >
                {p.fullName} <span className="text-xs text-ink-500">· {p.uhid}</span>
              </button>
            ))}
          </div>
          {selectedPatient && (
            <div className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
              Selected: <strong>{selectedPatient.fullName}</strong>
              <button className="ml-2 text-xs underline" onClick={() => setSelectedPatient(null)}>change</button>
            </div>
          )}

          <div className="mt-5 space-y-1 border-t border-ink-100 pt-4">
            {DEPTS.map((d) => (
              <button
                key={d.key}
                onClick={() => setDept(d.key)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${dept === d.key ? 'bg-brand-500 text-white' : 'text-ink-700 hover:bg-surface-muted'}`}
              >
                <d.icon size={15} /> {d.label}
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-2">
          {!selectedPatient && (
            <Card><p className="py-10 text-center text-sm text-ink-500">Select a patient to capture or view forms.</p></Card>
          )}
          {selectedPatient && dept === 'BloodBank' && <BloodBankPanel patientId={selectedPatient.id} />}
          {selectedPatient && dept === 'Dialysis' && <DialysisPanel patientId={selectedPatient.id} />}
          {selectedPatient && dept === 'Nutrition' && <NutritionPanel patientId={selectedPatient.id} />}
        </div>
      </div>
    </div>
  )
}

const COMPONENTS = ['WholeBlood', 'PRBC', 'FFP', 'Platelets', 'Cryoprecipitate']
const REACTION_TYPES = ['Allergic', 'Febrile', 'Hemolytic', 'Anaphylactic', 'TRALI', 'Other']
const OUTCOMES = ['Ongoing', 'Resolved', 'Fatal']

function BloodBankPanel({ patientId }: { patientId: number }) {
  const dispatch = useAppDispatch()
  const { transfusionReactions, status } = useAppSelector((state) => state.newDepartments)
  const [form, setForm] = useState({ bloodGroup: '', componentTransfused: 'PRBC', unitsTransfused: '', reactionType: 'Febrile', symptoms: '', actionTaken: '', outcome: 'Ongoing', remarks: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { dispatch(fetchTransfusionReactions(patientId)) }, [dispatch, patientId])

  const save = async () => {
    setSubmitting(true)
    try {
      await dispatch(recordTransfusionReaction({
        patientId, bloodGroup: form.bloodGroup || undefined, componentTransfused: form.componentTransfused,
        unitsTransfused: form.unitsTransfused ? Number(form.unitsTransfused) : undefined, reactionType: form.reactionType,
        symptoms: form.symptoms || undefined, actionTaken: form.actionTaken || undefined, outcome: form.outcome, remarks: form.remarks || undefined,
      }))
      toast.success('Transfusion reaction recorded.')
      setForm({ bloodGroup: '', componentTransfused: 'PRBC', unitsTransfused: '', reactionType: 'Febrile', symptoms: '', actionTaken: '', outcome: 'Ongoing', remarks: '' })
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-ink-900">Transfusion Reaction Form</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Input label="Blood group" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
          <Select label="Component" value={form.componentTransfused} onChange={(e) => setForm({ ...form, componentTransfused: e.target.value })}>
            {COMPONENTS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Units" value={form.unitsTransfused} onChange={(e) => setForm({ ...form, unitsTransfused: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select label="Reaction type" value={form.reactionType} onChange={(e) => setForm({ ...form, reactionType: e.target.value })}>
            {REACTION_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Select label="Outcome" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })}>
            {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </div>
        <Input label="Symptoms" value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} />
        <Input label="Action taken" value={form.actionTaken} onChange={(e) => setForm({ ...form, actionTaken: e.target.value })} />
        <Input label="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        <Button loading={submitting} onClick={save}>Record Reaction</Button>
      </div>

      <div className="mt-5 space-y-2 border-t border-ink-100 pt-4">
        {status === 'loading' && <p className="text-sm text-ink-500">Loading…</p>}
        {transfusionReactions.map((r) => (
          <div key={r.id} className="rounded-lg bg-surface-muted p-3 text-sm">
            <p className="mb-1 flex items-center justify-between text-xs font-medium text-ink-500">
              {new Date(r.onsetTime).toLocaleString()} · {r.reportedByName}
              <span className="flex items-center gap-2">
                <Badge tone={r.outcome === 'Fatal' ? 'danger' : r.outcome === 'Resolved' ? 'success' : 'warning'}>{r.outcome}</Badge>
                <button
                  className="font-medium text-brand-600 hover:underline"
                  onClick={() => downloadFile(`/bloodbank/transfusion-reactions/${r.id}/pdf`, `TransfusionReaction-${r.id}.pdf`).catch(() => toast.error('Could not download the PDF.'))}
                >
                  Download
                </button>
              </span>
            </p>
            <p className="text-ink-700">{r.componentTransfused} ({r.unitsTransfused ?? '—'} units) · <strong>{r.reactionType}</strong></p>
            {r.symptoms && <p className="mt-1 text-xs text-ink-600">Symptoms: {r.symptoms}</p>}
            {r.actionTaken && <p className="text-xs text-ink-600">Action: {r.actionTaken}</p>}
          </div>
        ))}
        {transfusionReactions.length === 0 && status !== 'loading' && <p className="text-sm text-ink-500">No transfusion reactions recorded.</p>}
      </div>
    </Card>
  )
}

function DialysisPanel({ patientId }: { patientId: number }) {
  const dispatch = useAppDispatch()
  const { dialysisSessions, status } = useAppSelector((state) => state.newDepartments)
  const [form, setForm] = useState({
    dialysisType: 'Hemodialysis', durationMinutes: '', preWeight: '', postWeight: '', preBloodPressure: '',
    postBloodPressure: '', dialyzerType: '', bloodFlowRate: '', ufGoal: '', ufAchieved: '', complications: '', remarks: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { dispatch(fetchDialysisSessions(patientId)) }, [dispatch, patientId])

  const save = async () => {
    setSubmitting(true)
    try {
      await dispatch(recordDialysisSession({
        patientId, dialysisType: form.dialysisType,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
        preWeight: form.preWeight ? Number(form.preWeight) : undefined,
        postWeight: form.postWeight ? Number(form.postWeight) : undefined,
        preBloodPressure: form.preBloodPressure || undefined, postBloodPressure: form.postBloodPressure || undefined,
        dialyzerType: form.dialyzerType || undefined, bloodFlowRate: form.bloodFlowRate ? Number(form.bloodFlowRate) : undefined,
        ufGoal: form.ufGoal ? Number(form.ufGoal) : undefined, ufAchieved: form.ufAchieved ? Number(form.ufAchieved) : undefined,
        complications: form.complications || undefined, remarks: form.remarks || undefined,
      }))
      toast.success('Dialysis session recorded.')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-ink-900">Dialysis Record</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Select label="Type" value={form.dialysisType} onChange={(e) => setForm({ ...form, dialysisType: e.target.value })}>
            <option value="Hemodialysis">Hemodialysis</option>
            <option value="Peritoneal">Peritoneal</option>
          </Select>
          <Input label="Duration (min)" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Pre-weight (kg)" value={form.preWeight} onChange={(e) => setForm({ ...form, preWeight: e.target.value })} />
          <Input label="Post-weight (kg)" value={form.postWeight} onChange={(e) => setForm({ ...form, postWeight: e.target.value })} />
          <Input label="Pre BP" value={form.preBloodPressure} onChange={(e) => setForm({ ...form, preBloodPressure: e.target.value })} />
          <Input label="Post BP" value={form.postBloodPressure} onChange={(e) => setForm({ ...form, postBloodPressure: e.target.value })} />
        </div>
        <Input label="Dialyzer type" value={form.dialyzerType} onChange={(e) => setForm({ ...form, dialyzerType: e.target.value })} />
        <div className="grid grid-cols-3 gap-2">
          <Input label="Blood flow (ml/min)" value={form.bloodFlowRate} onChange={(e) => setForm({ ...form, bloodFlowRate: e.target.value })} />
          <Input label="UF goal (L)" value={form.ufGoal} onChange={(e) => setForm({ ...form, ufGoal: e.target.value })} />
          <Input label="UF achieved (L)" value={form.ufAchieved} onChange={(e) => setForm({ ...form, ufAchieved: e.target.value })} />
        </div>
        <Input label="Complications" value={form.complications} onChange={(e) => setForm({ ...form, complications: e.target.value })} />
        <Input label="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        <Button loading={submitting} onClick={save}>Record Session</Button>
      </div>

      <div className="mt-5 space-y-2 border-t border-ink-100 pt-4">
        {status === 'loading' && <p className="text-sm text-ink-500">Loading…</p>}
        {dialysisSessions.map((s) => (
          <div key={s.id} className="rounded-lg bg-surface-muted p-3 text-sm">
            <p className="mb-1 flex items-center justify-between text-xs font-medium text-ink-500">
              <span>{new Date(s.sessionDate).toLocaleString()} · {s.performedByName}</span>
              <button
                className="font-medium text-brand-600 hover:underline"
                onClick={() => downloadFile(`/dialysis/sessions/${s.id}/pdf`, `DialysisSession-${s.id}.pdf`).catch(() => toast.error('Could not download the PDF.'))}
              >
                Download
              </button>
            </p>
            <div className="flex flex-wrap gap-3 text-ink-700">
              <span>{s.dialysisType}</span>
              {s.durationMinutes != null && <span>{s.durationMinutes} min</span>}
              {s.preWeight != null && s.postWeight != null && <span>{s.preWeight}→{s.postWeight} kg</span>}
              {s.ufAchieved != null && <span>UF {s.ufAchieved}L</span>}
            </div>
            {s.complications && <p className="mt-1 text-xs text-danger-500">Complications: {s.complications}</p>}
          </div>
        ))}
        {dialysisSessions.length === 0 && status !== 'loading' && <p className="text-sm text-ink-500">No dialysis sessions recorded.</p>}
      </div>
    </Card>
  )
}

const DIET_TYPES = ['Normal', 'Diabetic', 'Renal', 'Liquid', 'SoftDiet', 'HighProtein', 'Other']
const RISK_LEVELS = ['Low', 'Medium', 'High']

function NutritionPanel({ patientId }: { patientId: number }) {
  const dispatch = useAppDispatch()
  const { nutritionAssessments, status } = useAppSelector((state) => state.newDepartments)
  const [form, setForm] = useState({ heightCm: '', weightKg: '', dietType: 'Normal', nutritionalRisk: 'Low', dietaryHistory: '', allergies: '', recommendations: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { dispatch(fetchNutritionAssessments(patientId)) }, [dispatch, patientId])

  const save = async () => {
    setSubmitting(true)
    try {
      await dispatch(recordNutritionAssessment({
        patientId, heightCm: form.heightCm ? Number(form.heightCm) : undefined, weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        dietType: form.dietType, nutritionalRisk: form.nutritionalRisk, dietaryHistory: form.dietaryHistory || undefined,
        allergies: form.allergies || undefined, recommendations: form.recommendations || undefined,
      }))
      toast.success('Nutrition assessment recorded.')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-ink-900">Initial Assessment by Nutrition</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input label="Height (cm)" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
          <Input label="Weight (kg)" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select label="Diet type" value={form.dietType} onChange={(e) => setForm({ ...form, dietType: e.target.value })}>
            {DIET_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select label="Nutritional risk" value={form.nutritionalRisk} onChange={(e) => setForm({ ...form, nutritionalRisk: e.target.value })}>
            {RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
        <Input label="Dietary history" value={form.dietaryHistory} onChange={(e) => setForm({ ...form, dietaryHistory: e.target.value })} />
        <Input label="Allergies" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
        <Input label="Recommendations" value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} />
        <Button loading={submitting} onClick={save}>Record Assessment</Button>
      </div>

      <div className="mt-5 space-y-2 border-t border-ink-100 pt-4">
        {status === 'loading' && <p className="text-sm text-ink-500">Loading…</p>}
        {nutritionAssessments.map((a) => (
          <div key={a.id} className="rounded-lg bg-surface-muted p-3 text-sm">
            <p className="mb-1 flex items-center justify-between text-xs font-medium text-ink-500">
              {new Date(a.assessedAt).toLocaleString()} · {a.assessedByName}
              <span className="flex items-center gap-2">
                <Badge tone={a.nutritionalRisk === 'High' ? 'danger' : a.nutritionalRisk === 'Medium' ? 'warning' : 'success'}>{a.nutritionalRisk} risk</Badge>
                <button
                  className="font-medium text-brand-600 hover:underline"
                  onClick={() => downloadFile(`/nutrition/assessments/${a.id}/pdf`, `NutritionAssessment-${a.id}.pdf`).catch(() => toast.error('Could not download the PDF.'))}
                >
                  Download
                </button>
              </span>
            </p>
            <div className="flex flex-wrap gap-3 text-ink-700">
              <span>{a.dietType}</span>
              {a.bmi != null && <span>BMI {a.bmi}</span>}
              {a.heightCm != null && <span>{a.heightCm} cm</span>}
              {a.weightKg != null && <span>{a.weightKg} kg</span>}
            </div>
            {a.recommendations && <p className="mt-1 text-xs text-ink-600">Recommendations: {a.recommendations}</p>}
          </div>
        ))}
        {nutritionAssessments.length === 0 && status !== 'loading' && <p className="text-sm text-ink-500">No nutrition assessments recorded.</p>}
      </div>
    </Card>
  )
}
