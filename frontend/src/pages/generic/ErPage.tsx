import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Siren } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchPatients } from '../../features/patients/patientsSlice'
import { fetchActiveErVisits, registerErVisit } from '../../features/er/erSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { SearchBox } from '../../components/ui/ListToolbar'
import { extractErrorMessage } from '../../api/client'
import { ErVisitFormsModal } from './ErVisitFormsModal'
import type { ErVisitDto } from '../../types'

const TRIAGE_OPTIONS = ['Red', 'Yellow', 'Green']
const ARRIVAL_MODES = ['WalkIn', 'Ambulance', 'Referred']

function triageTone(t: string): 'danger' | 'warning' | 'success' {
  return t === 'Red' ? 'danger' : t === 'Yellow' ? 'warning' : 'success'
}

export function ErPage() {
  const dispatch = useAppDispatch()
  const role = useAppSelector((state) => state.auth.user?.role)
  const { active, status } = useAppSelector((state) => state.er)
  const { list: patientList } = useAppSelector((state) => state.patients)

  const [modalOpen, setModalOpen] = useState(false)
  const [formsVisit, setFormsVisit] = useState<ErVisitDto | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<{ id: number; fullName: string } | null>(null)
  const [modeOfArrival, setModeOfArrival] = useState('WalkIn')
  const [broughtBy, setBroughtBy] = useState('')
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [triageCategory, setTriageCategory] = useState('Yellow')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { dispatch(fetchActiveErVisits()) }, [dispatch])

  useEffect(() => {
    const handle = setTimeout(() => {
      if (patientSearch.trim().length >= 2) dispatch(fetchPatients({ pageNumber: 1, pageSize: 6, search: patientSearch }))
    }, 300)
    return () => clearTimeout(handle)
  }, [dispatch, patientSearch])

  const resetForm = () => {
    setSelectedPatient(null); setPatientSearch(''); setModeOfArrival('WalkIn'); setBroughtBy('')
    setChiefComplaint(''); setTriageCategory('Yellow')
  }

  const register = async () => {
    if (!selectedPatient || !chiefComplaint.trim()) {
      toast.error('Select a patient and enter the chief complaint.')
      return
    }
    setSubmitting(true)
    try {
      await dispatch(registerErVisit({
        patientId: selectedPatient.id, modeOfArrival, broughtBy: broughtBy || undefined,
        chiefComplaint: chiefComplaint.trim(), triageCategory,
      }))
      toast.success('ER visit registered.')
      setModalOpen(false)
      resetForm()
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<ErVisitDto>[] = [
    { key: 'triage', header: 'Triage', render: (v) => <Badge tone={triageTone(v.triageCategory)}>{v.triageCategory}</Badge> },
    { key: 'patient', header: 'Patient', render: (v) => <>{v.patientName}<span className="block text-xs text-ink-500">{v.uhid}</span></> },
    { key: 'complaint', header: 'Chief complaint', render: (v) => v.chiefComplaint },
    { key: 'arrival', header: 'Arrival', render: (v) => <>{new Date(v.arrivalTime).toLocaleTimeString()}<span className="block text-xs text-ink-500">{v.modeOfArrival ?? '—'}</span></> },
    { key: 'status', header: 'Status', render: (v) => <Badge>{v.status}</Badge> },
    {
      key: 'actions', header: '', render: (v) => (
        <button onClick={() => setFormsVisit(v)} className="text-xs font-medium text-brand-600 hover:underline">Assess</button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Emergency (ER)"
        subtitle="Triage board and ER doctor/nurse assessment forms."
        actions={<Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Register ER Visit</Button>}
      />

      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <Siren size={16} /> Active ER Visits
        </div>
        <div className="p-4">
          <Table columns={columns} rows={active} keyField={(v) => v.id} loading={status === 'loading'} emptyMessage="No patients currently in the ER." />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title="Register ER Visit">
        <div className="space-y-3">
          <SearchBox value={patientSearch} onChange={setPatientSearch} placeholder="Search patient by name or UHID…" className="w-full" />
          <div className="space-y-1">
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
            <div className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
              Selected: <strong>{selectedPatient.fullName}</strong>
              <button className="ml-2 text-xs underline" onClick={() => setSelectedPatient(null)}>change</button>
            </div>
          )}
          <Select label="Mode of arrival" value={modeOfArrival} onChange={(e) => setModeOfArrival(e.target.value)}>
            {ARRIVAL_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Input label="Brought by (optional)" value={broughtBy} onChange={(e) => setBroughtBy(e.target.value)} />
          <Input label="Chief complaint" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
          <Select label="Triage category" value={triageCategory} onChange={(e) => setTriageCategory(e.target.value)}>
            {TRIAGE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); resetForm() }}>Cancel</Button>
            <Button loading={submitting} onClick={register}>Register</Button>
          </div>
        </div>
      </Modal>

      {formsVisit && <ErVisitFormsModal visit={formsVisit} role={role} onClose={() => setFormsVisit(null)} />}
    </div>
  )
}
