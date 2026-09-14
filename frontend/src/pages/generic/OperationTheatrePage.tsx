import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Scissors } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { surgeryResource, type SurgeryRow } from '../../features/generic/resources'
import { fetchActiveAdmissions } from '../../features/ipd/ipdSlice'
import { fetchDoctors } from '../../features/doctors/doctorsSlice'
import { apiClient, extractErrorMessage } from '../../api/client'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { HandwritingField } from '../../components/clinical/HandwritingField'
import { SurgeryFormsModal } from './SurgeryFormsModal'

export function OperationTheatrePage() {
  const dispatch = useAppDispatch()
  const role = useAppSelector((state) => state.auth.user?.role)
  const { items, status } = useAppSelector((state) => state.surgery)
  const { active } = useAppSelector((state) => state.ipd)
  const { list: doctors } = useAppSelector((state) => state.doctors)

  const [modalOpen, setModalOpen] = useState(false)
  const [admissionId, setAdmissionId] = useState<number | ''>('')
  const [surgeryName, setSurgeryName] = useState('')
  const [surgeonId, setSurgeonId] = useState<number | ''>('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [cost, setCost] = useState(0)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formsSurgery, setFormsSurgery] = useState<SurgeryRow | null>(null)

  // "Mark completed" - Operation Notes support the stylus (was a bare window.prompt before); Anesthesia
  // wasn't captured from this UI at all despite the backend already accepting it.
  const [completeTarget, setCompleteTarget] = useState<SurgeryRow | null>(null)
  const [completeNotes, setCompleteNotes] = useState('')
  const [completeAnesthesia, setCompleteAnesthesia] = useState('')
  const [completeFieldKey, setCompleteFieldKey] = useState(0)
  const [completeSubmitting, setCompleteSubmitting] = useState(false)

  const refresh = () => dispatch(surgeryResource.fetchAll())
  useEffect(() => { refresh(); dispatch(fetchActiveAdmissions()); dispatch(fetchDoctors()) }, [dispatch])

  const schedule = async () => {
    const admission = active.find((a) => a.id === admissionId)
    if (!admission || !surgeonId || !surgeryName || !scheduledAt) return
    setSubmitting(true)
    try {
      await dispatch(surgeryResource.create(
        { patientId: admission.patientId, ipdAdmissionId: admission.id, surgeryName, surgeonDoctorId: surgeonId, scheduledAt, operationCost: cost, notes: notes || undefined },
        undefined,
        '/operationtheatre', // the resource's default endpoint ('/operationtheatre/today') is a GET-only view; scheduling has to POST to the base route.
      ))
      toast.success('Surgery scheduled.')
      setModalOpen(false); setSurgeryName(''); setSurgeonId(''); setScheduledAt(''); setCost(0); setAdmissionId(''); setNotes('')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const openComplete = (s: SurgeryRow) => {
    setCompleteTarget(s)
    setCompleteNotes(''); setCompleteAnesthesia('')
    setCompleteFieldKey((k) => k + 1)
  }

  const handleMarkCompleted = async () => {
    if (!completeTarget || !completeNotes.trim()) return
    setCompleteSubmitting(true)
    try {
      await apiClient.put(`/operationtheatre/${completeTarget.id}/complete`, { operationNotes: completeNotes, anesthesia: completeAnesthesia || undefined })
      toast.success('Surgery marked completed.')
      setCompleteTarget(null)
      refresh()
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setCompleteSubmitting(false)
    }
  }

  const columns: Column<SurgeryRow>[] = [
    { key: 'patient', header: 'Patient', render: (s) => s.patientName },
    { key: 'surgery', header: 'Surgery', render: (s) => s.surgeryName },
    { key: 'surgeon', header: 'Surgeon', render: (s) => s.surgeonName },
    { key: 'scheduled', header: 'Scheduled', render: (s) => new Date(s.scheduledAt).toLocaleString() },
    { key: 'cost', header: 'Cost', render: (s) => `₹${s.operationCost}` },
    { key: 'status', header: 'Status', render: (s) => <Badge>{s.status}</Badge> },
    {
      key: 'actions', header: '', render: (s) => (
        <div className="flex items-center gap-3">
          <button onClick={() => setFormsSurgery(s)} className="text-xs font-medium text-brand-600 hover:underline">Forms</button>
          {role === 'Doctor' && s.status === 'Scheduled' && (
            <button onClick={() => openComplete(s)} className="text-xs font-medium text-brand-600 hover:underline">Mark completed</button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Operation Theatre"
        subtitle="Today's surgical schedule."
        actions={<Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Schedule Surgery</Button>}
      />
      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <Scissors size={16} /> Today's Schedule
        </div>
        <div className="p-4">
          <Table columns={columns} rows={items} keyField={(s) => s.id} loading={status === 'loading'} emptyMessage="No surgeries scheduled for today." />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Schedule Surgery">
        <div className="space-y-4">
          <Select label="Admitted patient" value={admissionId} onChange={(e) => setAdmissionId(Number(e.target.value) || '')}>
            <option value="">Select admission</option>
            {active.map((a) => <option key={a.id} value={a.id}>{a.patientName} · {a.bedNumber}</option>)}
          </Select>
          <Input label="Surgery name" value={surgeryName} onChange={(e) => setSurgeryName(e.target.value)} />
          <Select label="Surgeon" value={surgeonId} onChange={(e) => setSurgeonId(Number(e.target.value) || '')}>
            <option value="">Select doctor</option>
            {doctors?.items.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
          </Select>
          <Input label="Scheduled at" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          <Input label="Operation cost" type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={submitting} onClick={schedule}>Schedule</Button>
          </div>
        </div>
      </Modal>

      {formsSurgery && <SurgeryFormsModal surgery={formsSurgery} onClose={() => setFormsSurgery(null)} />}

      <Modal open={!!completeTarget} onClose={() => setCompleteTarget(null)} title="Mark Surgery Completed">
        {completeTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">{completeTarget.surgeryName} · {completeTarget.patientName}</p>
            <HandwritingField
              key={completeFieldKey}
              label="Operation notes (type or draw with stylus)"
              value={completeNotes}
              onChange={setCompleteNotes}
              multiline
              required
              padHeight={160}
            />
            <Input label="Anesthesia (optional)" value={completeAnesthesia} onChange={(e) => setCompleteAnesthesia(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setCompleteTarget(null)}>Cancel</Button>
              <Button loading={completeSubmitting} disabled={!completeNotes.trim()} onClick={handleMarkCompleted}>Mark Completed</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
