import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import {
  fetchChecklists, saveChecklist, fetchAnesthesiaRecords, recordAnesthesia,
  fetchRecoveryRecords, recordRecovery, dischargeFromRecovery,
  fetchNursingNotes, addNursingNote,
} from '../../features/ot/otRecordsSlice'
import { CHECKLIST_TYPES, CHECKLIST_LABELS, CHECKLIST_DEFAULT_ITEMS, ALDRETE_COMPONENTS, type ChecklistType } from '../../utils/otChecklists'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { HandwritingField, isHandwritingCapture } from '../../components/clinical/HandwritingField'
import { downloadFile, extractErrorMessage } from '../../api/client'
import type { SurgeryRow } from '../../features/generic/resources'
import type { ChecklistItemDto, SurgeryChecklistDto, SurgeryAnesthesiaRecordDto, SurgeryRecoveryRecordDto } from '../../types'

type Tab = ChecklistType | 'Anesthesia' | 'Recovery' | 'NursingNotes'

const TABS: { key: Tab; label: string }[] = [
  { key: 'PreOp', label: CHECKLIST_LABELS.PreOp },
  { key: 'InstrumentSwabCount', label: CHECKLIST_LABELS.InstrumentSwabCount },
  { key: 'OTCleaning', label: CHECKLIST_LABELS.OTCleaning },
  { key: 'Anesthesia', label: 'Anesthesia Monitoring' },
  { key: 'Recovery', label: 'Post-Op Recovery (Aldrete)' },
  { key: 'NursingNotes', label: 'Nursing Notes' },
]

export function SurgeryFormsModal({ surgery, onClose }: { surgery: SurgeryRow; onClose: () => void }) {
  const dispatch = useAppDispatch()
  const { checklists, anesthesiaRecords, recoveryRecords, nursingNotes } = useAppSelector((state) => state.otRecords)
  const user = useAppSelector((state) => state.auth.user)
  const [tab, setTab] = useState<Tab>('PreOp')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    dispatch(fetchChecklists(surgery.id))
    dispatch(fetchAnesthesiaRecords(surgery.id))
    dispatch(fetchRecoveryRecords(surgery.id))
    dispatch(fetchNursingNotes(surgery.id))
  }, [dispatch, surgery.id])

  const downloadPdf = () =>
    downloadFile(`/operationtheatre/${surgery.id}/pdf`, `OTForms-${surgery.id}.pdf`).catch(() => toast.error('Could not download the PDF.'))

  return (
    <Modal open onClose={onClose} title={`Forms · ${surgery.surgeryName} (${surgery.patientName})`} widthClassName="max-w-3xl">
      <div className="mb-3 flex justify-end">
        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={downloadPdf}>Download All OT Forms (PDF)</Button>
      </div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-ink-100 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === t.key ? 'bg-brand-500 text-white' : 'text-ink-700 hover:bg-surface-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {CHECKLIST_TYPES.includes(tab as ChecklistType) && (
        <ChecklistTab
          surgeryId={surgery.id}
          checklistType={tab as ChecklistType}
          existing={checklists.find((c) => c.checklistType === tab)}
          submitting={submitting}
          setSubmitting={setSubmitting}
        />
      )}

      {tab === 'Anesthesia' && (
        <AnesthesiaTab surgeryId={surgery.id} records={anesthesiaRecords} submitting={submitting} setSubmitting={setSubmitting} />
      )}

      {tab === 'Recovery' && (
        <RecoveryTab surgeryId={surgery.id} records={recoveryRecords} submitting={submitting} setSubmitting={setSubmitting} />
      )}

      {tab === 'NursingNotes' && (
        <NursingNotesTab surgeryId={surgery.id} notes={nursingNotes} canAdd={user?.role === 'Nurse'} submitting={submitting} setSubmitting={setSubmitting} />
      )}
    </Modal>
  )
}

function ChecklistTab({ surgeryId, checklistType, existing, submitting, setSubmitting }: {
  surgeryId: number; checklistType: ChecklistType
  existing: SurgeryChecklistDto | undefined
  submitting: boolean; setSubmitting: (v: boolean) => void
}) {
  const dispatch = useAppDispatch()
  const [items, setItems] = useState<ChecklistItemDto[]>([])
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (existing) {
      setItems(existing.items)
      setRemarks(existing.remarks ?? '')
    } else {
      setItems(CHECKLIST_DEFAULT_ITEMS[checklistType].map((label) => ({ label, checked: false, remarks: null })))
      setRemarks('')
    }
  }, [existing, checklistType])

  const toggle = (index: number) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, checked: !it.checked } : it)))

  const save = async () => {
    setSubmitting(true)
    try {
      await dispatch(saveChecklist(surgeryId, checklistType, items, remarks || undefined))
      toast.success('Checklist saved.')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {existing && <p className="text-xs text-ink-500">Last saved by {existing.completedByName} on {new Date(existing.completedAt).toLocaleString()}</p>}
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <label key={item.label} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-muted">
            <input type="checkbox" checked={item.checked} onChange={() => toggle(i)} className="h-4 w-4 rounded border-ink-300 text-brand-500" />
            {item.label}
          </label>
        ))}
      </div>
      <Input label="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      <Button loading={submitting} onClick={save}>Save Checklist</Button>
    </div>
  )
}

function AnesthesiaTab({ surgeryId, records, submitting, setSubmitting }: {
  surgeryId: number; records: SurgeryAnesthesiaRecordDto[]; submitting: boolean; setSubmitting: (v: boolean) => void
}) {
  const dispatch = useAppDispatch()
  const [anesthesiaType, setAnesthesiaType] = useState('General')
  const [bloodPressure, setBloodPressure] = useState('')
  const [pulseRate, setPulseRate] = useState('')
  const [spO2, setSpO2] = useState('')
  const [temperature, setTemperature] = useState('')
  const [remarks, setRemarks] = useState('')

  const add = async () => {
    setSubmitting(true)
    try {
      await dispatch(recordAnesthesia({
        surgeryId, anesthesiaType: anesthesiaType || undefined, bloodPressure: bloodPressure || undefined,
        pulseRate: pulseRate ? Number(pulseRate) : undefined, spO2: spO2 ? Number(spO2) : undefined,
        temperature: temperature ? Number(temperature) : undefined, remarks: remarks || undefined,
      }))
      toast.success('Reading recorded.')
      setBloodPressure(''); setPulseRate(''); setSpO2(''); setTemperature(''); setRemarks('')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Select label="Anesthesia type" value={anesthesiaType} onChange={(e) => setAnesthesiaType(e.target.value)}>
          {['General', 'Spinal', 'Epidural', 'Local', 'Regional'].map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Input label="Blood pressure" placeholder="120/80" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
        <Input label="Pulse" value={pulseRate} onChange={(e) => setPulseRate(e.target.value)} />
        <Input label="SpO2 (%)" value={spO2} onChange={(e) => setSpO2(e.target.value)} />
        <Input label="Temp (°F)" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
        <Input label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>
      <Button loading={submitting} onClick={add}>Add Reading</Button>

      <div className="max-h-64 overflow-y-auto rounded-lg border border-ink-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-muted text-ink-500"><tr>
            <th className="px-3 py-2">Time</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">BP</th>
            <th className="px-3 py-2">Pulse</th><th className="px-3 py-2">SpO2</th><th className="px-3 py-2">Temp</th><th className="px-3 py-2">By</th>
          </tr></thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t border-ink-100">
                <td className="px-3 py-2">{new Date(r.recordedAt).toLocaleTimeString()}</td>
                <td className="px-3 py-2">{r.anesthesiaType ?? '—'}</td>
                <td className="px-3 py-2">{r.bloodPressure ?? '—'}</td>
                <td className="px-3 py-2">{r.pulseRate ?? '—'}</td>
                <td className="px-3 py-2">{r.spO2 ?? '—'}</td>
                <td className="px-3 py-2">{r.temperature ?? '—'}</td>
                <td className="px-3 py-2">{r.recordedByName}</td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-ink-500">No readings recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RecoveryTab({ surgeryId, records, submitting, setSubmitting }: {
  surgeryId: number; records: SurgeryRecoveryRecordDto[]; submitting: boolean; setSubmitting: (v: boolean) => void
}) {
  const dispatch = useAppDispatch()
  const [scores, setScores] = useState<Record<string, number>>({ activity: 2, respiration: 2, circulation: 2, consciousness: 2, oxygenSaturation: 2 })
  const [bloodPressure, setBloodPressure] = useState('')
  const [pulse, setPulse] = useState('')
  const [spO2, setSpO2] = useState('')
  const [remarks, setRemarks] = useState('')

  const total = useMemo(() => Object.values(scores).reduce((a, b) => a + b, 0), [scores])

  const add = async () => {
    setSubmitting(true)
    try {
      await dispatch(recordRecovery({
        surgeryId,
        activity: scores.activity, respiration: scores.respiration, circulation: scores.circulation,
        consciousness: scores.consciousness, oxygenSaturation: scores.oxygenSaturation,
        bloodPressure: bloodPressure || undefined, pulse: pulse ? Number(pulse) : undefined,
        spO2: spO2 ? Number(spO2) : undefined, remarks: remarks || undefined,
      }))
      toast.success('Recovery reading recorded.')
      setBloodPressure(''); setPulse(''); setSpO2(''); setRemarks('')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const discharge = async (id: number) => {
    try {
      await dispatch(dischargeFromRecovery(id, surgeryId))
      toast.success('Marked discharged from recovery.')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ALDRETE_COMPONENTS.map((c) => (
          <Select key={c.key} label={c.label} value={scores[c.key]} onChange={(e) => setScores((s) => ({ ...s, [c.key]: Number(e.target.value) }))}>
            {c.options.map((opt, score) => <option key={score} value={score}>{score} · {opt}</option>)}
          </Select>
        ))}
      </div>
      <p className="text-sm font-medium text-ink-700">Aldrete Total: <Badge tone={total >= 9 ? 'success' : total >= 7 ? 'warning' : 'danger'}>{total} / 10</Badge></p>
      <div className="grid grid-cols-3 gap-2">
        <Input label="Blood pressure" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
        <Input label="Pulse" value={pulse} onChange={(e) => setPulse(e.target.value)} />
        <Input label="SpO2 (%)" value={spO2} onChange={(e) => setSpO2(e.target.value)} />
      </div>
      <Input label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      <Button loading={submitting} onClick={add}>Record Reading</Button>

      <div className="max-h-56 overflow-y-auto rounded-lg border border-ink-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-muted text-ink-500"><tr>
            <th className="px-3 py-2">Time</th><th className="px-3 py-2">Aldrete</th><th className="px-3 py-2">BP</th>
            <th className="px-3 py-2">Pulse</th><th className="px-3 py-2">SpO2</th><th className="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t border-ink-100">
                <td className="px-3 py-2">{new Date(r.recordedAt).toLocaleTimeString()}</td>
                <td className="px-3 py-2">{r.aldreteTotal} / 10</td>
                <td className="px-3 py-2">{r.bloodPressure ?? '—'}</td>
                <td className="px-3 py-2">{r.pulse ?? '—'}</td>
                <td className="px-3 py-2">{r.spO2 ?? '—'}</td>
                <td className="px-3 py-2">
                  {r.dischargedFromRecoveryAt
                    ? <span className="text-ink-500">Discharged</span>
                    : <button onClick={() => discharge(r.id)} className="font-medium text-brand-600 hover:underline">Discharge</button>}
                </td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-ink-500">No recovery readings yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NursingNotesTab({ surgeryId, notes, canAdd, submitting, setSubmitting }: {
  surgeryId: number; notes: import('../../types').SurgeryNursingNoteDto[]; canAdd: boolean
  submitting: boolean; setSubmitting: (v: boolean) => void
}) {
  const dispatch = useAppDispatch()
  const [noteText, setNoteText] = useState('')
  // Forces the handwriting field to remount after each save so it doesn't stay stuck in draw-mode
  // showing the previous note's canvas.
  const [fieldKey, setFieldKey] = useState(0)

  const add = async () => {
    if (!noteText.trim()) return
    setSubmitting(true)
    try {
      await dispatch(addNursingNote(surgeryId, noteText))
      toast.success('Nursing note added.')
      setNoteText('')
      setFieldKey((k) => k + 1)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {canAdd && (
        <div className="space-y-2">
          <HandwritingField key={fieldKey} label="New note (type or draw with stylus)" value={noteText} onChange={setNoteText} multiline padHeight={120} />
          <Button loading={submitting} disabled={!noteText.trim()} onClick={add}>Add Note</Button>
        </div>
      )}

      <div className="max-h-72 space-y-2 overflow-y-auto">
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg bg-surface-muted p-3 text-sm">
            <p className="mb-1 text-xs font-medium text-ink-500">{new Date(n.recordedAt).toLocaleString()} · {n.recordedByName}</p>
            {isHandwritingCapture(n.noteText) ? (
              <img src={n.noteText} alt="Handwritten note" className="max-h-28 rounded border border-ink-100 bg-white" />
            ) : (
              <p className="text-ink-700">{n.noteText}</p>
            )}
          </div>
        ))}
        {notes.length === 0 && <p className="text-sm text-ink-500">No nursing notes recorded yet.</p>}
      </div>
    </div>
  )
}
