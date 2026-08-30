import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Activity, Plus } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchActiveAdmissions } from '../../features/ipd/ipdSlice'
import { fetchNursingChart, recordVitals } from '../../features/nursing/nursingSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { extractErrorMessage } from '../../api/client'

export function NursingPage() {
  const dispatch = useAppDispatch()
  const { active } = useAppSelector((state) => state.ipd)
  const { chart, status } = useAppSelector((state) => state.nursing)

  const [admissionId, setAdmissionId] = useState<number | ''>('')
  const [form, setForm] = useState({ temperature: '', pulse: '', bloodPressure: '', oxygen: '', weight: '', sugarLevel: '', dailyNotes: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { dispatch(fetchActiveAdmissions()) }, [dispatch])
  useEffect(() => { if (admissionId) dispatch(fetchNursingChart(admissionId)) }, [dispatch, admissionId])

  const handleSubmit = async () => {
    if (!admissionId) return
    setSubmitting(true)
    try {
      await dispatch(recordVitals(admissionId, {
        temperature: form.temperature ? Number(form.temperature) : undefined,
        pulse: form.pulse ? Number(form.pulse) : undefined,
        bloodPressure: form.bloodPressure || undefined,
        oxygen: form.oxygen ? Number(form.oxygen) : undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        sugarLevel: form.sugarLevel ? Number(form.sugarLevel) : undefined,
        dailyNotes: form.dailyNotes || undefined,
      }))
      toast.success('Vitals recorded.')
      setForm({ temperature: '', pulse: '', bloodPressure: '', oxygen: '', weight: '', sugarLevel: '', dailyNotes: '' })
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Nursing" subtitle="Record vitals and monitor admitted patients." />

      <Card className="mb-4">
        <Select label="Select admitted patient" value={admissionId} onChange={(e) => setAdmissionId(Number(e.target.value) || '')}>
          <option value="">Select a patient</option>
          {active.map((a) => <option key={a.id} value={a.id}>{a.patientName} · {a.bedNumber}</option>)}
        </Select>
      </Card>

      {admissionId && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><Plus size={16} /> Record Vitals</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input label="Temp (°F)" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
                <Input label="Pulse" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} />
              </div>
              <Input label="Blood pressure" placeholder="120/80" value={form.bloodPressure} onChange={(e) => setForm({ ...form, bloodPressure: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input label="SpO2 (%)" value={form.oxygen} onChange={(e) => setForm({ ...form, oxygen: e.target.value })} />
                <Input label="Weight (kg)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>
              <Input label="Sugar level" value={form.sugarLevel} onChange={(e) => setForm({ ...form, sugarLevel: e.target.value })} />
              <Input label="Notes" value={form.dailyNotes} onChange={(e) => setForm({ ...form, dailyNotes: e.target.value })} />
              <Button className="w-full" loading={submitting} onClick={handleSubmit}>Save Vitals</Button>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><Activity size={16} /> Vitals History</h3>
            {status === 'loading' && <p className="text-sm text-ink-500">Loading…</p>}
            <div className="space-y-2">
              {chart.map((entry) => (
                <div key={entry.id} className="rounded-lg bg-surface-muted p-3 text-sm">
                  <p className="mb-1 text-xs font-medium text-ink-500">{new Date(entry.recordedAt).toLocaleString()} · {entry.nurseName}</p>
                  <div className="flex flex-wrap gap-3 text-ink-700">
                    {entry.temperature != null && <span>🌡 {entry.temperature}°F</span>}
                    {entry.pulse != null && <span>♥ {entry.pulse} bpm</span>}
                    {entry.bloodPressure && <span>BP {entry.bloodPressure}</span>}
                    {entry.oxygen != null && <span>SpO2 {entry.oxygen}%</span>}
                    {entry.weight != null && <span>{entry.weight} kg</span>}
                    {entry.sugarLevel != null && <span>Sugar {entry.sugarLevel}</span>}
                  </div>
                  {entry.dailyNotes && <p className="mt-1 text-xs text-ink-500">{entry.dailyNotes}</p>}
                </div>
              ))}
              {chart.length === 0 && status !== 'loading' && <p className="text-sm text-ink-500">No vitals recorded yet.</p>}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
